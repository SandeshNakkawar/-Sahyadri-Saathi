const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Booking = require('../models/bookingModel');
const Review = require('../models/reviewModel');
const SeatLock = require('../models/seatLockModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template
  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getAllTours = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();

  res.status(200).render('all-tours', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  // Get available dates for booking, taking seat locks into account (BookMyShow-style)
  const now = new Date();
  const rawDates = tour.startDates
    ? tour.startDates
        .filter(sd => new Date(sd.date) > now && !sd.soldOut)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  const availableDates = [];
  for (const sd of rawDates) {
    const query = { tour: tour._id, startDateId: sd._id.toString() };
    if (req.user) {
      query.user = { $ne: req.user.id };
    }
    const locks = await SeatLock.find(query);
    const lockedSeats = locks.reduce((sum, l) => sum + l.seats, 0);
    const effectiveSeats = Math.max(0, sd.availableSeats - lockedSeats);

    if (effectiveSeats > 0) {
      const dateCopy = sd.toObject();
      dateCopy.availableSeats = effectiveSeats;
      availableDates.push(dateCopy);
    }
  }

  // 2) Build template
  // 3) Render template using data from 1)
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
    availableDates
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser
  });
});

// Render list of user's bookings
exports.getMyBookings = catchAsync(async (req, res, next) => {
  // Optional dev fallback: if redirected with a session_id and booking not yet created via webhook,
  // we create it here to ensure the booking shows up locally (webhook often blocked).
  if (process.env.NODE_ENV !== 'production' && req.query.session_id) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
      if (session && session.client_reference_id && session.customer_email) {
        const userDoc = await User.findOne({ email: session.customer_email });
        if (userDoc) {
          const existing = await Booking.findOne({
            sessionId: session.id
          });
          if (!existing) {
            const meta = session.metadata || {};
            const guests = parseInt(meta.guests, 10) || 1;
            const tourId = session.client_reference_id;
            const startDateId = meta.startDateId;

            // 1) Atomically reduce seats in Tour model (for local dev fallback)
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

              if (result) {
                // Check if now sold out
                const updatedDate = result.startDates.id(startDateId);
                if (updatedDate && updatedDate.availableSeats <= 0) {
                  await Tour.updateOne(
                    { _id: tourId, 'startDates._id': startDateId },
                    { $set: { 'startDates.$.soldOut': true } }
                  );
                }
              }
            }

            // 2) Delete active SeatLock for this session to release the hold
            if (startDateId) {
              await SeatLock.deleteOne({
                tour: tourId,
                startDateId: startDateId,
                user: userDoc.id
              });
            }

            // 3) Create the booking document
            await Booking.create({
              tour: tourId,
              user: userDoc.id,
              price: parseFloat(meta.unitPrice) || (session.amount_total || 0) / 100 / guests,
              totalPrice: parseFloat(meta.totalPrice) || (session.amount_total || 0) / 100,
              guests: guests,
              startDate: meta.startDate ? new Date(meta.startDate) : new Date(),
              endDate: meta.endDate ? new Date(meta.endDate) : new Date(),
              paid: true,
              paymentStatus: 'paid',
              status: 'confirmed',
              sessionId: session.id
            });
          }
        }
      }
    } catch (e) {
      // ignore fallback errors, page will still render
      console.error('Error in local dev booking fallback:', e.message);
    }
  }

  const bookings = await Booking.find({ user: req.user.id })
    .sort({ createdAt: -1 });

  res.status(200).render('my-bookings', {
    title: 'My bookings',
    bookings
  });
});

// Render single booking detail
exports.getBookingDetail = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  // Users can only view their own bookings
  const bookingUserId = booking.user._id ? booking.user._id.toString() : booking.user.toString();
  if (req.user.role === 'user' && bookingUserId !== req.user.id) {
    return next(new AppError('You do not have permission to view this booking', 403));
  }

  res.status(200).render('booking-detail', {
    title: `Booking — ${booking.tour?.name || 'Details'}`,
    booking
  });
});

// Render billing page with user data and recent bookings
exports.getBilling = catchAsync(async (req, res, next) => {
  // Get recent bookings for transaction history
  const bookings = await Booking.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).render('billing', {
    title: 'Billing',
    user: req.user,
    bookings
  });
});

// Render user's own reviews
exports.getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user.id }).populate({
    path: 'tour',
    select: 'name slug imageCover'
  });

  res.status(200).render('my-reviews', {
    title: 'My reviews',
    reviews
  });
});

// ─── Admin Pages ─────────────────────────────────────────────────

exports.getAdminDashboard = catchAsync(async (req, res, next) => {
  const [totalBookings, revenueData, totalUsers, totalTours, recentBookings, bookingsByStatus] =
    await Promise.all([
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      User.countDocuments({ active: { $ne: false } }),
      Tour.countDocuments(),
      Booking.find().sort({ createdAt: -1 }).limit(10),
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

  res.status(200).render('admin/admin-dashboard', {
    title: 'Admin Dashboard',
    stats: {
      totalBookings,
      totalRevenue: revenueData.length > 0 ? revenueData[0].total : 0,
      totalUsers,
      totalTours
    },
    recentBookings,
    bookingsByStatus
  });
});

exports.getAdminBookings = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const bookings = await Booking.find(filter).sort({ createdAt: -1 });

  res.status(200).render('admin/admin-bookings', {
    title: 'Manage Bookings',
    bookings,
    currentStatus: req.query.status || 'all'
  });
});

exports.getAdminBookingDetail = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  // Get available guides for assignment dropdown
  const guides = await User.find({
    role: { $in: ['guide', 'lead-guide'] },
    active: { $ne: false }
  }).select('name email photo role');

  res.status(200).render('admin/admin-booking-detail', {
    title: `Booking — ${booking.tour?.name || booking._id}`,
    booking,
    guides
  });
});

// ─── Guide Pages ─────────────────────────────────────────────────

exports.getGuideTrips = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({
    guide: req.user.id,
    status: { $nin: ['cancelled', 'refunded'] }
  }).sort({ startDate: 1 });

  res.status(200).render('guide/guide-trips', {
    title: 'My Assigned Trips',
    bookings
  });
});

exports.getGuideTripDetail = catchAsync(async (req, res, next) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    guide: req.user.id
  });

  if (!booking) {
    return next(new AppError('No trip found with that ID assigned to you', 404));
  }

  // Get all bookings for this tour/date (traveler list)
  const travelers = await Booking.find({
    tour: booking.tour._id || booking.tour,
    startDate: booking.startDate,
    status: { $nin: ['cancelled', 'refunded', 'pending_payment'] }
  }).select('user guests pickupLocation status');

  res.status(200).render('guide/guide-trip-detail', {
    title: `Trip — ${booking.tour?.name || 'Details'}`,
    booking,
    travelers
  });
});

// ─── Static Pages ────────────────────────────────────────────────

// About page
exports.getAbout = (req, res) => {
  res.status(200).render('about', {
    title: 'About us'
  });
};

// Contact page
exports.getContact = (req, res) => {
  res.status(200).render('contact', {
    title: 'Contact us'
  });
};

// Careers page
exports.getCareers = (req, res) => {
  res.status(200).render('careers', {
    title: 'Careers'
  });
};
