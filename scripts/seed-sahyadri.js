/**
 * Seed Script — Sahyadri Saathi
 * 
 * Creates fresh seed data for the guide marketplace.
 * Run: node scripts/seed-sahyadri.js
 * 
 * WARNING: This will drop existing collections and create new ones.
 */

const dotenv = require('dotenv');
dotenv.config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/userModel');
const Place = require('../models/placeModel');
const GuideProfile = require('../models/guideProfileModel');
const GuideBooking = require('../models/guideBookingModel');
const Review = require('../models/reviewModel');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

async function seed() {
  try {
    await mongoose.connect(DB);
    console.log('✅ Database connected');

    // ─── Drop old collections ──────────────────────────────────
    console.log('🗑️  Dropping old collections...');
    const collections = ['tours', 'bookings', 'seatlocks', 'reviews', 'users', 'places', 'guideprofiles', 'guidebookings', 'payoutrequests', 'conversations'];
    for (const col of collections) {
      try {
        await mongoose.connection.db.dropCollection(col);
        console.log(`   Dropped: ${col}`);
      } catch (e) {
        // Collection may not exist
      }
    }

    // ─── Create Users ────────────────────────────────────────────
    console.log('\n👥 Creating users...');

    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@sahyadrisaathi.com',
        role: 'admin',
        password: 'admin1234',
        passwordConfirm: 'admin1234',
        phone: '+91-9999900000',
        authProvider: 'local'
      },
      {
        name: 'Rajesh Patil',
        email: 'rajesh@example.com',
        role: 'guide',
        password: 'guide1234',
        passwordConfirm: 'guide1234',
        phone: '+91-9876543210',
        authProvider: 'local'
      },
      {
        name: 'Priya Deshpande',
        email: 'priya@example.com',
        role: 'guide',
        password: 'guide1234',
        passwordConfirm: 'guide1234',
        phone: '+91-9876543211',
        authProvider: 'local'
      },
      {
        name: 'Aarav Sharma',
        email: 'aarav@example.com',
        role: 'tourist',
        password: 'tourist1234',
        passwordConfirm: 'tourist1234',
        phone: '+91-9876543212',
        authProvider: 'local'
      },
      {
        name: 'Meera Joshi',
        email: 'meera@example.com',
        role: 'tourist',
        password: 'tourist1234',
        passwordConfirm: 'tourist1234',
        phone: '+91-9876543213',
        authProvider: 'local'
      }
    ]);

    const [admin, rajesh, priya, aarav, meera] = users;
    console.log(`   Created ${users.length} users`);

    // ─── Create Places ───────────────────────────────────────────
    console.log('\n🏰 Creating places...');
    const places = await Place.create([
      {
        name: 'Raigad Fort',
        location: 'Raigad',
        city: 'Mahad',
        district: 'Raigad',
        state: 'Maharashtra',
        category: 'fort',
        description: 'The majestic capital of the Maratha Empire under Chhatrapati Shivaji Maharaj. Perched at 2,700 feet, this hill fortress offers breathtaking views and a deep dive into Maratha history.',
        history: 'Raigad Fort was the capital of the Maratha Empire established by Chhatrapati Shivaji Maharaj. The coronation ceremony of Shivaji Maharaj took place here in 1674. The fort has several historically significant structures including the main market, queens quarters, and the famous Takmak Tok point.',
        difficultyLevel: 'moderate',
        bestSeason: 'October to March',
        imageCover: 'default-place.jpg',
        coordinates: { type: 'Point', coordinates: [73.4483, 18.2345] },
        entryFee: 20,
        estimatedDuration: '4-6 hours',
        isActive: true,
        featured: true,
        createdBy: admin._id
      },
      {
        name: 'Sinhagad Fort',
        location: 'Pune',
        city: 'Pune',
        district: 'Pune',
        state: 'Maharashtra',
        category: 'fort',
        description: 'One of the most popular forts near Pune, known for the legendary Battle of Sinhagad fought by Tanaji Malusare. A favorite weekend trek for Punekars.',
        history: 'Originally known as Kondhana, the fort was renamed Sinhagad (Lion Fort) after the heroic sacrifice of Tanaji Malusare who captured it from the Mughals in 1670. The famous words "Gad aala pan Sinha gela" (The fort is won but the lion is lost) were spoken by Shivaji Maharaj upon hearing of Tanaji\'s death.',
        difficultyLevel: 'easy',
        bestSeason: 'June to March',
        imageCover: 'default-place.jpg',
        coordinates: { type: 'Point', coordinates: [73.7553, 18.3664] },
        entryFee: 0,
        estimatedDuration: '3-4 hours',
        isActive: true,
        featured: true,
        createdBy: admin._id
      },
      {
        name: 'Rajgad Fort',
        location: 'Pune',
        city: 'Velhe',
        district: 'Pune',
        state: 'Maharashtra',
        category: 'fort',
        description: 'The "King of Forts" — Rajgad was the capital of Maratha Empire for 26 years before Raigad. One of the most challenging and rewarding treks in Maharashtra.',
        history: 'Rajgad served as the capital of the Maratha kingdom from 1648 to 1674 before Shivaji Maharaj moved the capital to Raigad. The fort has three machis (plateaus) — Sanjivani Machi, Padmavati Machi, and Suvela Machi.',
        difficultyLevel: 'difficult',
        bestSeason: 'September to February',
        imageCover: 'default-place.jpg',
        coordinates: { type: 'Point', coordinates: [73.6827, 18.2454] },
        entryFee: 0,
        estimatedDuration: '6-8 hours',
        isActive: true,
        featured: true,
        createdBy: admin._id
      },
      {
        name: 'Lohagad Fort',
        location: 'Lonavala',
        city: 'Lonavala',
        district: 'Pune',
        state: 'Maharashtra',
        category: 'fort',
        description: 'A stunning hill fort located near Lonavala, famous for the Vinchukata (scorpion tail) formation and panoramic monsoon views. Perfect for beginners.',
        history: 'Lohagad means "Iron Fort". It was used by various dynasties including the Satavahanas, Chalukyas, Rashtrakutas, Yadavas, Bahamanis, Mughals, and Marathas. Shivaji Maharaj used this fort to store the treasure looted from Surat.',
        difficultyLevel: 'easy',
        bestSeason: 'June to February',
        imageCover: 'default-place.jpg',
        coordinates: { type: 'Point', coordinates: [73.4757, 18.7089] },
        entryFee: 0,
        estimatedDuration: '3-4 hours',
        isActive: true,
        featured: false,
        createdBy: admin._id
      },
      {
        name: 'Pratapgad Fort',
        location: 'Satara',
        city: 'Mahabaleshwar',
        district: 'Satara',
        state: 'Maharashtra',
        category: 'fort',
        description: 'The fort where the historic Battle of Pratapgad took place between Shivaji Maharaj and Afzal Khan. A must-visit for Maratha history enthusiasts.',
        history: 'Built in 1656 by Shivaji Maharaj, Pratapgad is famous for the encounter between Shivaji and Afzal Khan. The fort has a temple of goddess Bhavani at its base and offers panoramic views of the Sahyadri ranges.',
        difficultyLevel: 'moderate',
        bestSeason: 'October to May',
        imageCover: 'default-place.jpg',
        coordinates: { type: 'Point', coordinates: [73.5788, 17.9361] },
        entryFee: 10,
        estimatedDuration: '4-5 hours',
        isActive: true,
        featured: false,
        createdBy: admin._id
      },
      {
        name: 'Torna Fort',
        location: 'Pune',
        city: 'Velhe',
        district: 'Pune',
        state: 'Maharashtra',
        category: 'fort',
        description: 'The highest fort in Pune district and the first fort captured by Shivaji Maharaj at the age of 16. A challenging trek rewarding with spectacular views.',
        history: 'Torna Fort, also known as Prachandagad, is historically significant as the first fort captured by Chhatrapati Shivaji Maharaj in 1643 when he was just 16 years old. This event marked the beginning of the Maratha Empire.',
        difficultyLevel: 'difficult',
        bestSeason: 'September to February',
        imageCover: 'default-place.jpg',
        coordinates: { type: 'Point', coordinates: [73.6233, 18.2775] },
        entryFee: 0,
        estimatedDuration: '5-7 hours',
        isActive: true,
        featured: true,
        createdBy: admin._id
      }
    ]);

    console.log(`   Created ${places.length} places`);

    // ─── Create Guide Profiles ───────────────────────────────────
    console.log('\n🧭 Creating guide profiles...');
    const guideProfiles = await GuideProfile.create([
      {
        user: rajesh._id,
        displayName: 'Rajesh Patil',
        bio: 'Born and raised in the shadow of Sahyadri ranges. I have been exploring Maharashtra forts since childhood. With 8 years of guiding experience, I specialize in Maratha history, fort architecture, and trekking. I speak fluent Marathi, Hindi, and English. Let me bring the stories of Shivaji Maharaj alive for you!',
        profilePhoto: 'default.jpg',
        baseCity: 'Pune',
        serviceLocations: [places[0]._id, places[1]._id, places[2]._id, places[5]._id],
        languages: ['Marathi', 'Hindi', 'English'],
        specialties: ['history', 'trekking', 'photography'],
        experienceYears: 8,
        pricePerDay: 2000,
        halfDayPrice: 1200,
        maxGroupSize: 15,
        availability: [
          { startDate: new Date('2026-06-01'), endDate: new Date('2026-12-31') }
        ],
        travelRadiusKm: 100,
        verificationStatus: 'approved',
        isPublic: true,
        ratingsAverage: 4.7,
        ratingsQuantity: 23,
        totalEarnings: 0
      },
      {
        user: priya._id,
        displayName: 'Priya Deshpande',
        bio: 'A passionate storyteller and certified trek leader. I love connecting travelers with the rich cultural heritage of Maharashtra. My tours focus on local food, village culture, and the lesser-known stories behind the forts. I am especially popular with families and solo travelers.',
        profilePhoto: 'default.jpg',
        baseCity: 'Satara',
        serviceLocations: [places[0]._id, places[3]._id, places[4]._id],
        languages: ['Marathi', 'Hindi', 'English', 'Kannada'],
        specialties: ['culture', 'food', 'family', 'solo'],
        experienceYears: 5,
        pricePerDay: 1500,
        halfDayPrice: 900,
        maxGroupSize: 10,
        availability: [
          { startDate: new Date('2026-06-01'), endDate: new Date('2026-12-31') }
        ],
        travelRadiusKm: 80,
        verificationStatus: 'approved',
        isPublic: true,
        ratingsAverage: 4.9,
        ratingsQuantity: 15,
        totalEarnings: 0
      }
    ]);

    console.log(`   Created ${guideProfiles.length} guide profiles`);

    // ─── Create Sample Bookings ──────────────────────────────────
    console.log('\n📋 Creating sample bookings...');
    const bookings = await GuideBooking.create([
      {
        tourist: aarav._id,
        guideProfile: guideProfiles[0]._id,
        place: places[1]._id,
        startDate: new Date('2026-07-15'),
        endDate: new Date('2026-07-15'),
        numberOfDays: 1,
        numberOfTravelers: 2,
        totalPrice: 2000,
        platformCommissionRate: 0.15,
        platformCommissionAmount: 300,
        guidePayoutAmount: 1700,
        status: 'completed',
        paymentStatus: 'paid',
        payoutStatus: 'paid',
        completion: {
          guideMarkedCompleted: true,
          touristConfirmedCompleted: true,
          guideCompletedAt: new Date('2026-07-15'),
          touristCompletedAt: new Date('2026-07-16'),
          completedAt: new Date('2026-07-16')
        },
        meetingPoint: 'Sinhagad Fort base village parking'
      },
      {
        tourist: meera._id,
        guideProfile: guideProfiles[1]._id,
        place: places[4]._id,
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-11'),
        numberOfDays: 2,
        numberOfTravelers: 3,
        totalPrice: 3000,
        platformCommissionRate: 0.15,
        platformCommissionAmount: 450,
        guidePayoutAmount: 2550,
        status: 'confirmed',
        paymentStatus: 'paid',
        payoutStatus: 'not_eligible',
        meetingPoint: 'Mahabaleshwar bus stand'
      },
      {
        tourist: aarav._id,
        guideProfile: guideProfiles[0]._id,
        place: places[2]._id,
        startDate: new Date('2026-09-20'),
        endDate: new Date('2026-09-21'),
        numberOfDays: 2,
        numberOfTravelers: 1,
        totalPrice: 4000,
        platformCommissionRate: 0.15,
        platformCommissionAmount: 600,
        guidePayoutAmount: 3400,
        status: 'pending',
        paymentStatus: 'unpaid',
        payoutStatus: 'not_eligible',
        specialRequests: 'I am interested in night camping on the fort.'
      }
    ]);

    console.log(`   Created ${bookings.length} bookings`);

    // ─── Create Sample Reviews ───────────────────────────────────
    console.log('\n⭐ Creating sample reviews...');
    const reviews = await Review.create([
      {
        review: 'Rajesh was an incredible guide! His knowledge of Sinhagad history is unmatched. He showed us secret paths and told stories that made the fort come alive. The trek was well-paced and he carried extra water for the group. Highly recommended!',
        rating: 5,
        guideProfile: guideProfiles[0]._id,
        booking: bookings[0]._id,
        user: aarav._id
      }
    ]);

    console.log(`   Created ${reviews.length} reviews`);

    // ─── Summary ─────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(50));
    console.log('✅ SEED COMPLETE — Sahyadri Saathi');
    console.log('═'.repeat(50));
    console.log('\nTest Credentials:');
    console.log('─'.repeat(40));
    console.log('Admin:   admin@sahyadrisaathi.com / admin1234');
    console.log('Guide:   rajesh@example.com / guide1234');
    console.log('Guide:   priya@example.com / guide1234');
    console.log('Tourist: aarav@example.com / tourist1234');
    console.log('Tourist: meera@example.com / tourist1234');
    console.log('─'.repeat(40));
    console.log(`\nPlaces:  ${places.length}`);
    console.log(`Guides:  ${guideProfiles.length}`);
    console.log(`Bookings: ${bookings.length}`);
    console.log(`Reviews: ${reviews.length}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
