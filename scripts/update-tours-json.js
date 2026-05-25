const fs = require('fs');
const path = require('path');

const toursFilePath = path.join(__dirname, '../dev-data/data/tours.json');
const tours = JSON.parse(fs.readFileSync(toursFilePath, 'utf-8'));

const priceMap = {
  '5c88fa8cf4afda39709c2955': 18000, // Goa Beach Explorer
  '5c88fa8cf4afda39709c2951': 12500, // Himalayan Trekker
  '5c88fa8cf4afda39709c295a': 34999, // Ladakh Adventurer
  '5c88fa8cf4afda39709c2961': 28500, // Royal Rajasthan Explorer
  '5c88fa8cf4afda39709c295d': 19999, // Heritage Wanderer
  '5c88fa8cf4afda39709c2966': 24999, // Adventure Seeker
  '5c88fa8cf4afda39709c2970': 16500, // Desert Star Gazer
  '5c88fa8cf4afda39709c2974': 22000, // Kerala Backwater Cruise
  '5c88fa8cf4afda39709c296c': 11999, // Vineyard Explorer
  '5c88fa8cf4afda39709c2980': 18999, // Meghalaya Explorer
  '5c88fa8cf4afda39709c2984': 38000, // Andaman Paradise
  '5c88fa8cf4afda39709c2988': 9500,  // Varanasi Spiritual
  '5c88fa8cf4afda39709c298b': 21500, // Sikkim Mountain Trail
  '5c88fa8cf4afda39709c298f': 13500, // Hampi Heritage Trail
  '5c88fa8cf4afda39709c2993': 29999  // Spiti Valley Traverse
};

const updatedTours = tours.map(tour => {
  const price = priceMap[tour._id] || (tour.price * 10);
  
  // Create beautiful future startDates
  const startDates = [
    {
      date: '2026-10-15T09:00:00.000Z',
      availableSeats: tour.maxGroupSize,
      soldOut: false
    },
    {
      date: '2026-12-20T09:00:00.000Z',
      availableSeats: tour.maxGroupSize,
      soldOut: false
    },
    {
      date: '2027-02-15T09:00:00.000Z',
      availableSeats: tour.maxGroupSize,
      soldOut: false
    }
  ];

  return {
    ...tour,
    price,
    startDates
  };
});

fs.writeFileSync(toursFilePath, JSON.stringify(updatedTours, null, 2), 'utf-8');
console.log('✅ Successfully updated tours.json with INR prices and future subdocument startDates!');
