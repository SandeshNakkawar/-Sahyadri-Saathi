const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const GuideBooking = require('../models/guideBookingModel');
const GuideProfile = require('../models/guideProfileModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Redis for webhook event deduplication (with in-memory fallback)
const redisClient = require('../utils/redisClient');
const processedWebhookEvents = new Set();

// ─── Create Checkout Session ─────────────────────────────────────
exports.createCheckoutSession = catchAsync(async (req, res, next) => {
  const booking = await GuideBooking.findById(req.params.bookingId);

  if (!booking) {
    return next(new AppError('No booking found with that ID.', 404));
  }

  // Validate tourist owns this booking
  const touristId = booking.tourist._id
    ? booking.tourist._id.toString()
    : booking.tourist.toString();
  if (req.user.id !== touristId) {
    return next(new AppError('You can only pay for your own bookings.', 403));
  }

  // Validate booking is in accepted state
  if (booking.status !== 'accepted') {
    return next(new AppError('Payment is only available after the guide accepts your booking.', 400));
  }

  // Validate payment not already made
  if (booking.paymentStatus === 'paid') {
    return next(new AppError('This booking has already been paid.', 400));
  }

  // Get guide info for display
  const guide = await GuideProfile.findById(
    booking.guideProfile._id || booking.guideProfile
  );
  const place = booking.place;

  // Generate idempotency key
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000));
  const idempotencyKey = `checkout_${req.user.id}_${booking._id}_${timestamp}`;

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
      cancel_url: `${req.protocol}://${req.get('host')}/booking/${booking._id}`,
      customer_email: req.user.email,
      client_reference_id: booking._id.toString(),
      metadata: {
        bookingId: booking._id.toString(),
        guideProfileId: (booking.guideProfile._id || booking.guideProfile).toString(),
        placeId: (place._id || place).toString(),
        startDate: booking.startDate.toISOString(),
        endDate: booking.endDate.toISOString(),
        totalPrice: booking.totalPrice.toString()
      },
      line_items: [
        {
          price_data: {
            currency: process.env.STRIPE_CURRENCY || 'inr',
            product_data: {
              name: `Guide Booking — ${guide ? guide.displayName : 'Local Guide'}`,
              description: `${place ? place.name : 'Place'} | ${booking.numberOfTravelers} traveler(s) | ${booking.numberOfDays} day(s) | ${new Date(booking.startDate).toLocaleDateString()}`
            },
            unit_amount: Math.round(booking.totalPrice * 100)
          },
          quantity: 1
        }
      ]
    },
    {
      idempotencyKey
    }
  );

  res.status(200).json({
    status: 'success',
    session
  });
});

// ─── Webhook: Handle Stripe Payment ─────────────────────────────
const handleSuccessfulPayment = async session => {
  const webhookKey = `webhook:guide-booking:${session.id}`;
  const expirySeconds = 24 * 60 * 60;

  // Deduplication: Redis or in-memory
  if (redisClient.isRedisAvailable()) {
    const claimed = await redisClient.setIfNotExists(
      webhookKey,
      { processed: true, timestamp: new Date() },
      expirySeconds
    );
    if (!claimed) {
      console.log('Webhook already claimed (Redis):', session.id);
      return;
    }
  } else {
    if (processedWebhookEvents.has(session.id)) {
      console.log('Webhook already processed (in-memory):', session.id);
      return;
    }
    processedWebhookEvents.add(session.id);
  }

  const meta = session.metadata || {};
  const bookingId = meta.bookingId || session.client_reference_id;

  if (!bookingId) {
    console.error('No bookingId in webhook session:', session.id);
    return;
  }

  // Prevent double-processing
  const booking = await GuideBooking.findById(bookingId);
  if (!booking) {
    console.error('Booking not found for webhook:', bookingId);
    return;
  }

  if (booking.paymentStatus === 'paid') {
    console.log('Booking already paid:', bookingId);
    return;
  }

  // Update booking
  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  booking.stripeCheckoutSessionId = session.id;
  booking.stripePaymentIntentId = session.payment_intent;
  await booking.save();

  console.log('✅ Guide booking confirmed via payment:', bookingId);

  // Send confirmation email (non-blocking)
  try {
    const Email = require('../utils/email');
    const tourist = await User.findById(booking.tourist._id || booking.tourist);
    if (tourist) {
      const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/bookings`;
      await new Email(tourist, url).sendBookingConfirmation({
        guideName: booking.guideProfile?.displayName || 'Your Guide',
        placeName: booking.place?.name || 'Place',
        startDate: booking.startDate,
        totalPrice: booking.totalPrice
      });
    }
  } catch (emailErr) {
    console.error('Failed to send booking confirmation email:', emailErr.message);
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
      await handleSuccessfulPayment(event.data.object);
    } catch (err) {
      console.error('❌ Webhook booking update failed:', err);
      return res.status(500).json({
        status: 'error',
        message: `Payment processing failed: ${err.message}`
      });
    }
  }

  res.status(200).json({ received: true });
};

// ─── Get My Payments (Tourist) ───────────────────────────────────
exports.getMyPayments = catchAsync(async (req, res, next) => {
  const bookings = await GuideBooking.find({
    tourist: req.user.id,
    paymentStatus: { $ne: 'unpaid' }
  }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { payments: bookings }
  });
});

// ─── Dev Fallback: Confirm Payment Without Webhook ───────────────
exports.confirmPaymentFallback = catchAsync(async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next(new AppError('This route is not available in production.', 400));
  }

  const { sessionId } = req.query;
  if (!sessionId) {
    return next(new AppError('Please provide a session_id.', 400));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session && session.payment_status === 'paid') {
      await handleSuccessfulPayment(session);
    }
  } catch (err) {
    console.error('Dev fallback error:', err.message);
  }

  res.status(200).json({
    status: 'success',
    message: 'Payment confirmation processed (dev fallback).'
  });
});
