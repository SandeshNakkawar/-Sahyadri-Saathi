const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');

// ─── Dashboard Stats ─────────────────────────────────────────────
exports.getStats = catchAsync(async (req, res, next) => {
  const [totalBookings, totalRevenue, totalUsers, totalTours, bookingsByStatus] =
    await Promise.all([
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      User.countDocuments({ active: { $ne: false } }),
      Tour.countDocuments(),
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalBookings,
      totalRevenue:
        totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      totalUsers,
      totalTours,
      bookingsByStatus
    }
  });
});

// ─── Revenue Report ──────────────────────────────────────────────
exports.getRevenue = catchAsync(async (req, res, next) => {
  const year = req.query.year
    ? parseInt(req.query.year, 10)
    : new Date().getFullYear();

  const monthlyRevenue = await Booking.aggregate([
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
        bookings: { $sum: 1 },
        guests: { $sum: '$guests' }
      }
    },
    { $addFields: { month: '$_id' } },
    { $project: { _id: 0 } },
    { $sort: { month: 1 } }
  ]);

  const revenueByTour = await Booking.aggregate([
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
        _id: '$tour',
        revenue: { $sum: '$totalPrice' },
        bookings: { $sum: 1 },
        guests: { $sum: '$guests' }
      }
    },
    {
      $lookup: {
        from: 'tours',
        localField: '_id',
        foreignField: '_id',
        as: 'tourInfo'
      }
    },
    { $unwind: '$tourInfo' },
    {
      $project: {
        tourName: '$tourInfo.name',
        tourSlug: '$tourInfo.slug',
        revenue: 1,
        bookings: 1,
        guests: 1
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      year,
      monthlyRevenue,
      revenueByTour,
      totalRevenue: monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0)
    }
  });
});

// ─── Recent Bookings ─────────────────────────────────────────────
exports.getRecentBookings = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const bookings = await Booking.find()
    .sort({ createdAt: -1 })
    .limit(limit);

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

// ─── Bookings by Status ─────────────────────────────────────────
exports.getBookingsByStatus = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  const filter = {};

  if (status) filter.status = status;

  const bookings = await Booking.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

// ─── Get all guides (for assignment dropdown) ────────────────────
exports.getGuides = catchAsync(async (req, res, next) => {
  const guides = await User.find({
    role: { $in: ['guide', 'lead-guide'] },
    active: { $ne: false }
  }).select('name email photo role');

  res.status(200).json({
    status: 'success',
    results: guides.length,
    data: { guides }
  });
});
