/**
 * Migration: Convert flat startDates to subdocument format
 *
 * Converts existing tours with startDates: [Date] to the new format:
 * startDates: [{ date, availableSeats, price, soldOut }]
 *
 * Usage: node scripts/migrate-startdates.js
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
    const toursCollection = db.collection('tours');

    const tours = await toursCollection.find({}).toArray();
    console.log(`Found ${tours.length} tours to check`);

    let migratedCount = 0;

    for (const tour of tours) {
      if (!tour.startDates || tour.startDates.length === 0) {
        console.log(`  ⏭ ${tour.name}: No startDates, skipping`);
        continue;
      }

      // Check if already migrated (first element has a 'date' property)
      const firstDate = tour.startDates[0];
      if (firstDate && typeof firstDate === 'object' && firstDate.date) {
        console.log(`  ⏭ ${tour.name}: Already migrated, skipping`);
        continue;
      }

      // Convert flat dates to subdocument format
      const newStartDates = tour.startDates.map(dateVal => ({
        _id: new mongoose.Types.ObjectId(),
        date: new Date(dateVal),
        availableSeats: tour.maxGroupSize || 20,
        price: null, // Will fall back to tour.price
        soldOut: false
      }));

      await toursCollection.updateOne(
        { _id: tour._id },
        { $set: { startDates: newStartDates } }
      );

      console.log(`  ✅ ${tour.name}: Migrated ${newStartDates.length} dates (${tour.maxGroupSize || 20} seats each)`);
      migratedCount++;
    }

    console.log(`\n✅ Migration complete: ${migratedCount} tours migrated`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

migrate();
