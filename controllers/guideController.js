const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ─── Get My Assigned Trips ───────────────────────────────────────
exports.getMyTrips = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({
    guide: req.user.id,
    status: { $nin: ['cancelled', 'refunded'] }
  }).sort({ startDate: 1 });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

// ─── Get Trip Details ────────────────────────────────────────────
exports.getTripDetails = catchAsync(async (req, res, next) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    guide: req.user.id
  });

  if (!booking) {
    return next(
      new AppError('No trip found with that ID assigned to you', 404)
    );
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Get Traveler List for a Tour Date ───────────────────────────
exports.getTravelerList = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({
    tour: req.params.tourId,
    guide: req.user.id,
    status: { $nin: ['cancelled', 'refunded', 'pending_payment'] }
  }).select('user guests startDate endDate status pickupLocation');

  if (!bookings.length) {
    return next(
      new AppError('No travelers found for this tour assigned to you', 404)
    );
  }

  // Flatten to a traveler list
  const travelers = bookings.map(b => ({
    bookingId: b._id,
    user: b.user,
    guests: b.guests,
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.status,
    pickupLocation: b.pickupLocation
  }));

  res.status(200).json({
    status: 'success',
    results: travelers.length,
    data: { travelers }
  });
});

// ─── Update Trip Notes ───────────────────────────────────────────
exports.updateTripNotes = catchAsync(async (req, res, next) => {
  const { tripInstructions } = req.body;

  const booking = await Booking.findOneAndUpdate(
    {
      _id: req.params.id,
      guide: req.user.id
    },
    { tripInstructions },
    { new: true, runValidators: true }
  );

  if (!booking) {
    return next(
      new AppError('No trip found with that ID assigned to you', 404)
    );
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});
