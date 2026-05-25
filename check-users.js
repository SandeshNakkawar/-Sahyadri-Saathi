const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/userModel');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

async function check() {
  try {
    await mongoose.connect(DB);
    console.log('✅ Connected to MongoDB');

    const users = await User.find({});
    console.log(`\nFound ${users.length} users:`);
    users.forEach((u, idx) => {
      console.log(`User #${idx + 1}: Name=${u.name}, Email=${u.email}, Role=${u.role}, Active=${u.active}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Check failed:', err);
    process.exit(1);
  }
}

check();
