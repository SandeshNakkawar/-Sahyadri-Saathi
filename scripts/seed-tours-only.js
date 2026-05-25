const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Tour = require('./../models/tourModel');

// Set IPv4 default dns resolution first to avoid replica set connection issues
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

console.log('Connecting to database...');
mongoose
  .connect(DB)
  .then(() => console.log('✅ DB connection successful!'))
  .catch(err => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });

// Read JSON file
const tours = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../dev-data/data/tours.json'), 'utf-8')
);

// Import only tours
const seedTours = async () => {
  try {
    // Delete existing tours
    console.log('Wiping existing tours collection...');
    await Tour.deleteMany();
    console.log('✅ Tours collection wiped.');

    // Insert new tours
    console.log('Seeding new tours...');
    await Tour.create(tours);
    console.log('✅ Tours successfully seeded into database!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
  process.exit();
};

seedTours();
