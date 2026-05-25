/**
 * Migration: Backfill existing bookings with new lifecycle fields
 *
 * Adds default values for: status, paymentStatus, guests, totalPrice,
 * startDate, endDate to existing bookings that were created before
 * the schema upgrade.
 *
 * Usage: node scripts/migrate-bookings.js
 */
const dotenv = require('dotenv');
dotenv.config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const mongoose = require('mongoose');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

async function migrate() {
  try {
    await mongoose.connect(DB);
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    const bookingsCollection = db.collection('bookings');
    const toursCollection = db.collection('tours');

    const bookings = await bookingsCollection.find({}).toArray();
    console.log(`Found ${bookings.length} bookings to check`);

    let migratedCount = 0;

    for (const booking of bookings) {
      const updates = {};

      // Skip if already has new fields
      if (booking.status && booking.startDate && booking.totalPrice) {
        console.log(`  ⏭ Booking ${booking._id}: Already migrated`);
        continue;
      }

      // Set status based on paid flag
      if (!booking.status) {
        updates.status = booking.paid ? 'confirmed' : 'pending_payment';
      }

      // Set paymentStatus
      if (!booking.paymentStatus) {
        updates.paymentStatus = booking.paid ? 'paid' : 'pending';
      }

      // Set guests default
      if (!booking.guests) {
        updates.guests = 1;
      }

      // Set totalPrice
      if (!booking.totalPrice) {
        updates.totalPrice = booking.price || 0;
      }

      // Set refundStatus
      if (!booking.refundStatus) {
        updates.refundStatus = 'none';
      }

      // Try to set startDate/endDate from the tour's first startDate
      if (!booking.startDate && booking.tour) {
        const tour = await toursCollection.findOne({ _id: booking.tour });
        if (tour) {
          let startDateVal = null;

          if (tour.startDates && tour.startDates.length > 0) {
            const firstDate = tour.startDates[0];
            // Handle both old format (Date) and new format ({ date: Date })
            startDateVal = firstDate.date || firstDate;
          }

          if (startDateVal) {
            updates.startDate = new Date(startDateVal);
            // Calculate endDate from tour duration
            const endDate = new Date(startDateVal);
            endDate.setDate(endDate.getDate() + (tour.duration || 1));
            updates.endDate = endDate;
          } else {
            // Fallback: use booking creation date
            updates.startDate = booking.createdAt || new Date();
            const endDate = new Date(updates.startDate);
            endDate.setDate(endDate.getDate() + (tour.duration || 1));
            updates.endDate = endDate;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await bookingsCollection.updateOne(
          { _id: booking._id },
          { $set: updates }
        );
        console.log(`  ✅ Booking ${booking._id}: Updated ${Object.keys(updates).join(', ')}`);
        migratedCount++;
      }
    }

    console.log(`\n✅ Migration complete: ${migratedCount} bookings migrated`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

migrate();
