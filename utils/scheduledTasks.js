/**
 * Scheduled Tasks — Automated booking lifecycle management for Sahyadri Saathi
 *
 * Uses node-cron to run periodic tasks:
 * 1. Trip reminders: 2 days before startDate
 * 2. Review requests: 1 day after endDate
 *
 * Usage: require('./utils/scheduledTasks') in server.js
 */
const cron = require('node-cron');
const GuideBooking = require('../models/guideBookingModel');
const Place = require('../models/placeModel');
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
    const bookings = await GuideBooking.find({
      startDate: {
        $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
        $lte: new Date(twoDaysFromNow.setHours(23, 59, 59, 999))
      },
      status: 'confirmed',
      paymentStatus: 'paid'
    }).populate('place guideProfile tourist');

    console.log(`  Found ${bookings.length} upcoming guide trips to remind`);

    for (const booking of bookings) {
      try {
        const tourist = booking.tourist;
        if (!tourist) continue;

        const placeName = booking.place ? booking.place.name : 'Your Trip';
        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tourist-dashboard`;

        await new Email(tourist, url).sendTripReminder({
          tourName: placeName, // Email class expects tourName
          startDate: booking.startDate,
          guideName: booking.guideProfile ? booking.guideProfile.displayName : null,
          pickupLocation: booking.meetingPoint || 'Specified Meeting Point'
        });

        console.log(`  📧 Reminder sent to ${tourist.email} for guided trip to ${placeName}`);
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
    const bookings = await GuideBooking.find({
      endDate: {
        $gte: new Date(twoDaysAgo.setHours(0, 0, 0, 0)),
        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
      },
      status: 'completed',
      paymentStatus: 'paid'
    }).populate('place tourist');

    console.log(`  Found ${bookings.length} completed trips for review requests`);

    for (const booking of bookings) {
      try {
        const tourist = booking.tourist;
        if (!tourist) continue;

        const placeName = booking.place ? booking.place.name : 'Your Guided Trip';
        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tourist-dashboard`;

        await new Email(tourist, url).sendReviewRequest({
          tourName: placeName // Email class expects tourName
        });

        console.log(`  📧 Review request sent to ${tourist.email} for place ${placeName}`);
      } catch (emailErr) {
        console.error(`  ❌ Failed to send review request for booking ${booking._id}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error('❌ Review request task failed:', err);
  }
}, { scheduled: false });

// ─── Auto-Reject Stale Pending Bookings (runs every 6 hours) ────
// If a guide doesn't respond within 48 hours, the booking is auto-rejected
// and date locks are released so other tourists can book those dates.
const DateLock = require('../models/dateLockModel');

const autoRejectStaleBookings = cron.schedule('0 */6 * * *', async () => {
  try {
    console.log('🧹 Running stale booking auto-rejection...');

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);

    const staleBookings = await GuideBooking.find({
      status: 'pending',
      createdAt: { $lt: cutoff }
    });

    console.log(`  Found ${staleBookings.length} stale pending bookings (>48h)`);

    for (const booking of staleBookings) {
      booking.status = 'rejected';
      booking.cancellationReason = 'Auto-rejected: guide did not respond within 48 hours';
      await booking.save();

      // Release date locks
      await DateLock.deleteMany({ booking: booking._id });
      console.log(`  ❌ Auto-rejected booking ${booking._id}`);
    }
  } catch (err) {
    console.error('❌ Stale booking auto-rejection failed:', err);
  }
}, { scheduled: false });

// ─── Start all tasks ─────────────────────────────────────────────
function startScheduledTasks() {
  sendTripReminders.start();
  sendReviewRequests.start();
  autoRejectStaleBookings.start();
  console.log('📅 Scheduled tasks started: trip reminders, review requests, stale booking cleanup');
}

// ─── Stop all tasks ──────────────────────────────────────────────
function stopScheduledTasks() {
  sendTripReminders.stop();
  sendReviewRequests.stop();
  autoRejectStaleBookings.stop();
  console.log('📅 Scheduled tasks stopped');
}

module.exports = { startScheduledTasks, stopScheduledTasks };
