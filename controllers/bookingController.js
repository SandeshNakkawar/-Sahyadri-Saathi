const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const SeatLock = require('../models/seatLockModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// Redis for webhook event deduplication (with in-memory fallback)
const redisClient = require('../utils/redisClient');

// In-memory fallback store (used if Redis is unavailable)
const processedWebhookEvents = new Set();

// ─── Check Availability ─────────────────────────────────────────
exports.checkAvailability = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  const startDate = tour.getStartDate(req.params.startDateId);
  if (!startDate) {
    return next(new AppError('No start date found with that ID', 404));
  }

  // Deduct active seat locks (BookMyShow-style)
  // Exclude current user's lock so they don't get blocked by their own hold
  const locks = await SeatLock.find({
    tour: tour._id,
    startDateId: req.params.startDateId,
    user: { $ne: req.user.id }
  });
  const lockedSeats = locks.reduce((sum, l) => sum + l.seats, 0);
  const effectiveSeats = Math.max(0, startDate.availableSeats - lockedSeats);

  res.status(200).json({
    status: 'success',
    data: {
      tourId: tour._id,
      tourName: tour.name,
      date: startDate.date,
      availableSeats: effectiveSeats,
      soldOut: effectiveSeats <= 0 ? true : startDate.soldOut,
      price: startDate.price || tour.price
    }
  });
});

// ─── Create Checkout Session ─────────────────────────────────────
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const { startDateId, guests } = req.body;
  const tourId = req.params.tourId;
  const guestCount = parseInt(guests, 10) || 1;

  // 1) Get the tour
  const tour = await Tour.findById(tourId);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  // 2) Validate the selected start date
  if (!startDateId) {
    return next(new AppError('Please select a tour date', 400));
  }

  const selectedDate = tour.getStartDate(startDateId);
  if (!selectedDate) {
    return next(new AppError('Invalid tour date selected', 400));
  }

  // 3) Check date is not in the past
  if (new Date(selectedDate.date) < new Date()) {
    return next(new AppError('Cannot book a tour date in the past', 400));
  }

  // 4) Check availability (taking active holds into account)
  // Exclude current user's lock so they don't get blocked by their own hold when renewing
  const locks = await SeatLock.find({
    tour: tourId,
    startDateId: startDateId,
    user: { $ne: req.user.id }
  });
  const lockedSeats = locks.reduce((sum, l) => sum + l.seats, 0);
  const effectiveSeats = Math.max(0, selectedDate.availableSeats - lockedSeats);

  if (selectedDate.soldOut || effectiveSeats < guestCount) {
    return next(
      new AppError(
        `Not enough seats available. Only ${effectiveSeats} seats left (some are temporarily held by other checkout sessions).`,
        400
      )
    );
  }

  // 5) Validate guest count
  if (guestCount < 1 || guestCount > tour.maxGroupSize) {
    return next(
      new AppError(
        `Guest count must be between 1 and ${tour.maxGroupSize}`,
        400
      )
    );
  }

  // 6) Check for recent pending checkout sessions (within last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentBooking = await Booking.findOne({
    tour: tourId,
    user: req.user.id,
    startDate: selectedDate.date,
    createdAt: { $gte: fiveMinutesAgo },
    status: 'pending_payment'
  });

  if (recentBooking) {
    return res.status(409).json({
      status: 'error',
      message:
        'You have a recent booking for this tour date. Please wait a few minutes or check your bookings.',
      code: 'RECENT_BOOKING',
      bookingId: recentBooking._id
    });
  }

  // 7) Create the 5-minute SeatLock for this user session (BookMyShow-style)
  // Delete any previous lock this user had for the same tour date first
  await SeatLock.deleteOne({
    tour: tourId,
    startDateId: startDateId,
    user: req.user.id
  });

  await SeatLock.create({
    tour: tourId,
    startDateId: startDateId,
    user: req.user.id,
    seats: guestCount
  });

  // 8) Calculate pricing
  const unitPrice = selectedDate.price || tour.price;
  const totalPrice = unitPrice * guestCount;

  // 8) Generate idempotency key
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000));
  const idempotencyKey = `checkout_${req.user.id}_${tourId}_${startDateId}_${timestamp}`;

  // 9) Calculate end date
  const endDate = new Date(selectedDate.date);
  endDate.setDate(endDate.getDate() + tour.duration);

  // 10) Create Stripe checkout session
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/my-bookings?alert=booking&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
      customer_email: req.user.email,
      client_reference_id: tourId,
      metadata: {
        startDateId: startDateId,
        guests: guestCount.toString(),
        startDate: selectedDate.date.toISOString(),
        endDate: endDate.toISOString(),
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toString()
      },
      line_items: [
        {
          price_data: {
            currency: process.env.STRIPE_CURRENCY || 'inr',
            product_data: {
              name: `${tour.name} Tour`,
              description: `${tour.summary} | ${guestCount} guest(s) | ${new Date(selectedDate.date).toLocaleDateString()}`,
              images: [
                `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`
              ]
            },
            unit_amount: Math.round(unitPrice * 100)
          },
          quantity: guestCount
        }
      ]
    },
    {
      idempotencyKey: idempotencyKey
    }
  );

  res.status(200).json({
    status: 'success',
    session
  });
});

// ─── Webhook: Create Booking from Stripe ─────────────────────────
const createBookingCheckout = async session => {
  const webhookKey = `webhook:session:${session.id}`;
  const expirySeconds = 24 * 60 * 60; // 24 hours

  // ── Layer 1: Atomic Redis SETNX ──
  if (redisClient.isRedisAvailable()) {
    const claimed = await redisClient.setIfNotExists(
      webhookKey,
      { processed: true, timestamp: new Date() },
      expirySeconds
    );
    if (!claimed) {
      console.log(
        'Webhook already claimed by another request (Redis SETNX):',
        session.id
      );
      return;
    }
  } else {
    if (processedWebhookEvents.has(session.id)) {
      console.log('Webhook already processed (in-memory):', session.id);
      return;
    }
    processedWebhookEvents.add(session.id);
  }

  // ── Layer 2: DB-level check ──
  const existingBooking = await Booking.findOne({ sessionId: session.id });
  if (existingBooking) {
    console.log('Booking already exists for session:', session.id);
    return;
  }

  // ── Layer 3: Decrement seats FIRST, then create booking ──
  // This ensures we never have a confirmed booking without capacity reduction.
  const tourId = session.client_reference_id;
  const userDoc = await User.findOne({ email: session.customer_email });
  if (!userDoc) {
    console.error('No user found for email:', session.customer_email);
    return;
  }

  const meta = session.metadata || {};
  const guests = parseInt(meta.guests, 10) || 1;
  const unitPrice = parseFloat(meta.unitPrice) || (session.amount_total || 0) / 100 / guests;
  const totalPrice = parseFloat(meta.totalPrice) || (session.amount_total || 0) / 100;
  const startDate = meta.startDate ? new Date(meta.startDate) : new Date();
  const endDate = meta.endDate ? new Date(meta.endDate) : new Date();
  const startDateId = meta.startDateId;

  // Step 1: Atomically reduce seats (if we have a startDateId)
  let seatsDecremented = false;
  if (startDateId) {
    const result = await Tour.findOneAndUpdate(
      {
        _id: tourId,
        'startDates._id': startDateId,
        'startDates.availableSeats': { $gte: guests }
      },
      {
        $inc: { 'startDates.$.availableSeats': -guests }
      },
      { new: true }
    );

    if (!result) {
      console.error(
        `❌ Seat decrement failed for tour ${tourId}, date ${startDateId}. Seats may be exhausted.`
      );
      // Don't create booking if seats can't be reserved
      return;
    }

    seatsDecremented = true;

    // Check if now sold out
    const updatedDate = result.startDates.id(startDateId);
    if (updatedDate && updatedDate.availableSeats <= 0) {
      await Tour.updateOne(
        { _id: tourId, 'startDates._id': startDateId },
        { $set: { 'startDates.$.soldOut': true } }
      );
      console.log('🚫 Date marked as sold out:', startDateId);
    }
    console.log(
      `📉 Seats reduced by ${guests} for date ${startDateId}. Remaining: ${updatedDate?.availableSeats}`
    );
  }

  // Step 2: Create the booking
  try {
    await Booking.create({
      tour: tourId,
      user: userDoc.id,
      price: unitPrice,
      totalPrice: totalPrice,
      guests: guests,
      startDate: startDate,
      endDate: endDate,
      paid: true,
      paymentStatus: 'paid',
      status: 'confirmed',
      sessionId: session.id
    });
    console.log('✅ Booking created successfully for session:', session.id);

    // Release the active 5-minute seat lock hold
    if (startDateId) {
      await SeatLock.deleteOne({
        tour: tourId,
        startDateId: startDateId,
        user: userDoc.id
      });
      console.log('🔓 SeatLock released successfully for user:', userDoc.id);
    }

    // Step 3: Send confirmation email (non-blocking)
    try {
      const Email = require('../utils/email');
      const tour = await Tour.findById(tourId);
      const url = `${process.env.BASE_URL || 'http://localhost:3000'}/my-bookings`;
      const email = new Email(userDoc, url);
      await email.sendBookingConfirmation({
        tourName: tour ? tour.name : 'Tour',
        startDate,
        endDate,
        guests,
        totalPrice,
        bookingId: session.id
      });
      console.log('📧 Booking confirmation email sent');
    } catch (emailErr) {
      // Don't fail the booking if email fails
      console.error('Failed to send booking confirmation email:', emailErr.message);
    }
  } catch (error) {
    if (error.code === 11000) {
      console.log(
        'Duplicate session prevented by DB unique constraint:',
        error.message
      );
      // Restore seats since booking was a duplicate
      if (seatsDecremented && startDateId) {
        await Tour.findOneAndUpdate(
          { _id: tourId, 'startDates._id': startDateId },
          {
            $inc: { 'startDates.$.availableSeats': guests },
            $set: { 'startDates.$.soldOut': false }
          }
        );
        console.log('🔄 Seats restored (duplicate booking prevented)');
      }
    } else {
      // Restore seats on unexpected error
      if (seatsDecremented && startDateId) {
        await Tour.findOneAndUpdate(
          { _id: tourId, 'startDates._id': startDateId },
          {
            $inc: { 'startDates.$.availableSeats': guests },
            $set: { 'startDates.$.soldOut': false }
          }
        );
        console.log('🔄 Seats restored (booking creation failed)');
      }
      throw error;
    }
  }
};

exports.webhookCheckout = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    try {
      await createBookingCheckout(event.data.object);
    } catch (err) {
      console.error('❌ Webhook booking creation failed:', err);
      // Return a 500 error to trigger Stripe automatic retries for payment integrity
      return res.status(500).json({
        status: 'error',
        message: `Booking creation failed: ${err.message}`
      });
    }
  }

  res.status(200).json({ received: true });
};

// ─── Billing Portal ──────────────────────────────────────────────
exports.getBillingPortal = catchAsync(async (req, res, next) => {
  const customers = await stripe.customers.list({
    email: req.user.email,
    limit: 1
  });
  let customer =
    customers.data && customers.data.length ? customers.data[0] : null;
  if (!customer) {
    customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.name
    });
  }

  try {
    const params = {
      customer: customer.id,
      return_url: `${req.protocol}://${req.get('host')}/billing`
    };
    if (process.env.STRIPE_BILLING_PORTAL_CONFIGURATION) {
      params.configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION;
    }
    const session = await stripe.billingPortal.sessions.create(params);
    return res.redirect(303, session.url);
  } catch (err) {
    const msg =
      'Stripe Billing Portal is not configured in test mode. In your Stripe Dashboard, go to Settings → Billing → Customer portal (Test mode) and save a default configuration, or set STRIPE_BILLING_PORTAL_CONFIGURATION.';
    return next(new AppError(msg, 400));
  }
});

// ─── Get My Bookings (API) ───────────────────────────────────────
exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id }).sort({
    createdAt: -1
  });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

// ─── Update Booking Status (Admin) ───────────────────────────────
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = [
    'pending_payment',
    'confirmed',
    'guide_assigned',
    'ready_for_trip',
    'completed',
    'cancelled',
    'refunded'
  ];

  if (!status || !validStatuses.includes(status)) {
    return next(
      new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
    );
  }

  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Assign Guide (Admin) ────────────────────────────────────────
exports.assignGuide = catchAsync(async (req, res, next) => {
  const { guideId } = req.body;

  if (!guideId) {
    return next(new AppError('Please provide a guide ID', 400));
  }

  // Verify the guide exists and has the correct role
  const guide = await User.findById(guideId);
  if (!guide || !['guide', 'lead-guide'].includes(guide.role)) {
    return next(new AppError('No guide found with that ID', 404));
  }

  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    {
      guide: guideId,
      status: 'guide_assigned'
    },
    { new: true, runValidators: true }
  );

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  // Send guide assignment email to user
  try {
    const Email = require('../utils/email');
    const user = await User.findById(booking.user._id || booking.user);
    if (user) {
      const url = `${process.env.BASE_URL || 'http://localhost:3000'}/booking/${booking._id}`;
      const email = new Email(user, url);
      await email.sendGuideAssignment({
        tourName: booking.tour?.name || 'Tour',
        guideName: guide.name,
        guideEmail: guide.email,
        startDate: booking.startDate
      });
    }
  } catch (emailErr) {
    console.error('Failed to send guide assignment email:', emailErr.message);
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Cancel Booking (User or Admin) ──────────────────────────────
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  // Users can only cancel their own bookings
  const bookingUserId = booking.user._id ? booking.user._id.toString() : booking.user.toString();
  if (
    req.user.role === 'user' &&
    bookingUserId !== req.user.id
  ) {
    return next(new AppError('You can only cancel your own bookings', 403));
  }

  // Cannot cancel already cancelled/completed bookings
  if (['cancelled', 'refunded', 'completed'].includes(booking.status)) {
    return next(
      new AppError(`Cannot cancel a booking with status: ${booking.status}`, 400)
    );
  }

  const { reason } = req.body;

  booking.status = 'cancelled';
  booking.cancellationReason = reason || 'Cancelled by user';
  await booking.save({ validateBeforeSave: false });

  // Restore available seats
  if (booking.tour && booking.startDate) {
    await Tour.updateOne(
      {
        _id: booking.tour._id || booking.tour,
        'startDates.date': booking.startDate
      },
      {
        $inc: { 'startDates.$.availableSeats': booking.guests || 1 },
        $set: { 'startDates.$.soldOut': false }
      }
    );
    console.log(`📈 Seats restored for cancelled booking ${booking._id}`);
  }

  // Send cancellation email
  try {
    const Email = require('../utils/email');
    const user = await User.findById(booking.user._id || booking.user);
    if (user) {
      const url = `${process.env.BASE_URL || 'http://localhost:3000'}/my-bookings`;
      const email = new Email(user, url);
      await email.sendCancellation({
        tourName: booking.tour?.name || 'Tour',
        startDate: booking.startDate,
        reason: booking.cancellationReason
      });
    }
  } catch (emailErr) {
    console.error('Failed to send cancellation email:', emailErr.message);
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Refund Booking (Admin) ──────────────────────────────────────
exports.refundBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  if (!booking.paid) {
    return next(new AppError('Cannot refund an unpaid booking', 400));
  }

  if (booking.refundStatus === 'completed') {
    return next(new AppError('This booking has already been refunded', 400));
  }

  // Mark as refunded (in production, trigger stripe.refunds.create here)
  booking.status = 'refunded';
  booking.paymentStatus = 'refunded';
  booking.refundStatus = 'completed';
  await booking.save({ validateBeforeSave: false });

  // Send refund confirmation email
  try {
    const Email = require('../utils/email');
    const user = await User.findById(booking.user._id || booking.user);
    if (user) {
      const url = `${process.env.BASE_URL || 'http://localhost:3000'}/my-bookings`;
      const email = new Email(user, url);
      await email.sendRefundConfirmation({
        tourName: booking.tour?.name || 'Tour',
        totalPrice: booking.totalPrice,
        startDate: booking.startDate
      });
    }
  } catch (emailErr) {
    console.error('Failed to send refund email:', emailErr.message);
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Update Booking Details (Admin) ──────────────────────────────
exports.updateBookingDetails = catchAsync(async (req, res, next) => {
  const allowedFields = [
    'pickupLocation',
    'adminNotes',
    'tripInstructions',
    'status'
  ];
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid fields to update', 400));
  }

  const booking = await Booking.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Factory CRUD (backwards compatible) ─────────────────────────
exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
