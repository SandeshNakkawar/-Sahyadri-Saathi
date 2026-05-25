const GuideBooking = require('../models/guideBookingModel');
const Place = require('../models/placeModel');
const User = require('../models/userModel');
const GuideProfile = require('../models/guideProfileModel');
const Review = require('../models/reviewModel');
const PayoutRequest = require('../models/payoutRequestModel');
const catchAsync = require('../utils/catchAsync');

// ─── Dashboard Stats ─────────────────────────────────────────────
exports.getStats = catchAsync(async (req, res, next) => {
  const [
    totalBookings,
    totalRevenue,
    totalUsers,
    totalPlaces,
    totalGuides,
    pendingVerifications,
    pendingPayouts,
    bookingsByStatus
  ] = await Promise.all([
    GuideBooking.countDocuments(),
    GuideBooking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]),
    User.countDocuments({ active: { $ne: false } }),
    Place.countDocuments({ isActive: true }),
    GuideProfile.countDocuments({ verificationStatus: 'approved' }),
    GuideProfile.countDocuments({ verificationStatus: 'pending_review' }),
    PayoutRequest.countDocuments({ status: 'requested' }),
    GuideBooking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  const totalPlatformEarnings = await GuideBooking.aggregate([
    { $match: { paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$platformCommissionAmount' } } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalBookings,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      totalPlatformEarnings: totalPlatformEarnings.length > 0 ? totalPlatformEarnings[0].total : 0,
      totalUsers,
      totalPlaces,
      totalGuides,
      pendingVerifications,
      pendingPayouts,
      bookingsByStatus
    }
  });
});

// ─── Revenue Report ──────────────────────────────────────────────
exports.getRevenue = catchAsync(async (req, res, next) => {
  const year = req.query.year
    ? parseInt(req.query.year, 10)
    : new Date().getFullYear();

  const monthlyRevenue = await GuideBooking.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        revenue: { $sum: '$totalPrice' },
        commission: { $sum: '$platformCommissionAmount' },
        bookings: { $sum: 1 }
      }
    },
    { $addFields: { month: '$_id' } },
    { $project: { _id: 0 } },
    { $sort: { month: 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      year,
      monthlyRevenue,
      totalRevenue: monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0),
      totalCommission: monthlyRevenue.reduce((sum, m) => sum + m.commission, 0)
    }
  });
});

// ─── All Users ───────────────────────────────────────────────────
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;

  const users = await User.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

// ─── All Guides ──────────────────────────────────────────────────
exports.getAllGuides = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.verificationStatus = req.query.status;

  const guides = await GuideProfile.find(filter)
    .populate({ path: 'serviceLocations', select: 'name' })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: guides.length,
    data: { guides }
  });
});

// ─── All Bookings ────────────────────────────────────────────────
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.payoutStatus) filter.payoutStatus = req.query.payoutStatus;

  const bookings = await GuideBooking.find(filter)
    .populate('place tourist guideProfile')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

// ─── All Payouts ─────────────────────────────────────────────────
exports.getAllPayouts = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const payouts = await PayoutRequest.find(filter)
    .populate('guideProfile')
    .sort({ requestedAt: -1 });

  res.status(200).json({
    status: 'success',
    results: payouts.length,
    data: { payouts }
  });
});

// ─── All Reviews ─────────────────────────────────────────────────
exports.getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find()
    .populate({ path: 'guideProfile', select: 'displayName' })
    .populate({ path: 'booking', select: 'place startDate' })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});
