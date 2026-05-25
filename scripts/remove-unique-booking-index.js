/**
 * Script to remove the unique index on (tour, user) from bookings collection
 * This allows users to book the same tour multiple times
 * 
 * Run this once: node scripts/remove-unique-booking-index.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect(DB)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    try {
      // Drop the unique index
      await mongoose.connection.db.collection('bookings').dropIndex('tour_1_user_1');
      console.log('✅ Successfully removed unique index on (tour, user)');
      console.log('   Users can now book the same tour multiple times');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  Index does not exist (may have been removed already)');
      } else {
        console.error('❌ Error removing index:', error.message);
      }
    }
    
    // Create the new non-unique index for efficient querying
    try {
      await mongoose.connection.db.collection('bookings').createIndex(
        { tour: 1, user: 1, createdAt: -1 },
        { name: 'tour_user_createdAt_idx' }
      );
      console.log('✅ Created new non-unique index for efficient querying');
    } catch (error) {
      console.log('ℹ️  Index may already exist:', error.message);
    }
    
    await mongoose.connection.close();
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

