const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/userModel');
const Place = require('./models/placeModel');
const GuideProfile = require('./models/guideProfileModel');
const GuideBooking = require('./models/guideBookingModel');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

async function check() {
  try {
    await mongoose.connect(DB);
    console.log('✅ Connected to MongoDB');

    const bookings = await GuideBooking.find({});
    console.log(`\nFound ${bookings.length} bookings:`);
    bookings.forEach((b, idx) => {
      console.log(`Booking #${idx + 1}: ID=${b._id}, status=${b.status}, paymentStatus=${b.paymentStatus}, tourist=${b.tourist}, guide=${b.guideProfile}, place=${b.place}`);
    });

    const guides = await GuideProfile.find({});
    console.log(`\nFound ${guides.length} guide profiles:`);
    guides.forEach((g, idx) => {
      console.log(`Guide #${idx + 1}: Name=${g.displayName}, Status=${g.verificationStatus}, isPublic=${g.isPublic}, user=${g.user ? (g.user._id || g.user) : 'N/A'}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection or query failed:', err);
    process.exit(1);
  }
}

check();
