/**
 * Scheduled Tasks — Automated booking lifecycle management
 *
 * Uses node-cron to run periodic tasks:
 * 1. Trip reminders: 2 days before startDate
 * 2. Review requests: 1 day after endDate
 * 3. Auto-complete: Mark bookings as completed after endDate
 *
 * Usage: require('./utils/scheduledTasks') in server.js
 */
const cron = require('node-cron');
const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Email = require('./email');

// ─── Trip Reminders (runs daily at 9:00 AM) ─────────────────────
const sendTripReminders = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('⏰ Running trip reminder check...');

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find bookings starting in ~2 days
    const bookings = await Booking.find({
      startDate: {
        $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
        $lte: new Date(twoDaysFromNow.setHours(23, 59, 59, 999))
      },
      status: { $in: ['confirmed', 'guide_assigned', 'ready_for_trip'] },
      paid: true
    });

    console.log(`  Found ${bookings.length} upcoming trips to remind`);

    for (const booking of bookings) {
      try {
        const user = await User.findById(booking.user._id || booking.user);
        if (!user) continue;

        const tour = await Tour.findById(booking.tour._id || booking.tour);
        const url = `${process.env.BASE_URL || 'http://localhost:3000'}/booking/${booking._id}`;

        await new Email(user, url).sendTripReminder({
          tourName: tour ? tour.name : 'Your Tour',
          startDate: booking.startDate,
          guideName: booking.guide ? booking.guide.name : null,
          pickupLocation: booking.pickupLocation,
          tripInstructions: booking.tripInstructions
        });

        console.log(`  📧 Reminder sent to ${user.email} for ${tour ? tour.name : 'tour'}`);
      } catch (emailErr) {
        console.error(`  ❌ Failed to send reminder for booking ${booking._id}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error('❌ Trip reminder task failed:', err);
  }
}, { scheduled: false }); // Don't auto-start; call .start() manually

// ─── Review Requests (runs daily at 10:00 AM) ───────────────────
const sendReviewRequests = cron.schedule('0 10 * * *', async () => {
  try {
    console.log('⭐ Running review request check...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Find bookings that ended 1-2 days ago and are completed
    const bookings = await Booking.find({
      endDate: {
        $gte: new Date(twoDaysAgo.setHours(0, 0, 0, 0)),
        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
      },
      status: 'completed',
      paid: true
    });

    console.log(`  Found ${bookings.length} completed trips for review requests`);

    for (const booking of bookings) {
      try {
        const user = await User.findById(booking.user._id || booking.user);
        if (!user) continue;

        const tour = await Tour.findById(booking.tour._id || booking.tour);
        const url = `${process.env.BASE_URL || 'http://localhost:3000'}/tour/${tour ? tour.slug : ''}`;

        await new Email(user, url).sendReviewRequest({
          tourName: tour ? tour.name : 'Your Tour'
        });

        console.log(`  📧 Review request sent to ${user.email}`);
      } catch (emailErr) {
        console.error(`  ❌ Failed to send review request for booking ${booking._id}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error('❌ Review request task failed:', err);
  }
}, { scheduled: false });

// ─── Auto-Complete Bookings (runs daily at midnight) ─────────────
const autoCompleteBookings = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('✅ Running auto-complete check...');

    const now = new Date();

    // Find bookings whose endDate has passed but are still in active statuses
    const result = await Booking.updateMany(
      {
        endDate: { $lt: now },
        status: { $in: ['confirmed', 'guide_assigned', 'ready_for_trip'] },
        paid: true
      },
      {
        $set: { status: 'completed' }
      }
    );

    console.log(`  ✅ Auto-completed ${result.modifiedCount} bookings`);
  } catch (err) {
    console.error('❌ Auto-complete task failed:', err);
  }
}, { scheduled: false });

// ─── Start all tasks ─────────────────────────────────────────────
function startScheduledTasks() {
  sendTripReminders.start();
  sendReviewRequests.start();
  autoCompleteBookings.start();
  console.log('📅 Scheduled tasks started: trip reminders, review requests, auto-complete');
}

// ─── Stop all tasks ──────────────────────────────────────────────
function stopScheduledTasks() {
  sendTripReminders.stop();
  sendReviewRequests.stop();
  autoCompleteBookings.stop();
  console.log('📅 Scheduled tasks stopped');
}

module.exports = { startScheduledTasks, stopScheduledTasks };
