/**
 * Vercel Serverless Function entry.
 *
 * - Exports the Express app (no app.listen).
 * - Lazily initializes DB/Redis once per lambda instance (cached across warm invocations).
 */
const dotenv = require('dotenv');
dotenv.config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const app = require('../app');

let mongoInitPromise;
async function initMongo() {
  if (mongoose.connection?.readyState === 1) return;
  if (!mongoInitPromise) {
    const DB = process.env.DATABASE?.replace(
      '<PASSWORD>',
      process.env.DATABASE_PASSWORD
    );
    if (!DB) {
      throw new Error(
        'Missing DATABASE / DATABASE_PASSWORD env vars required to connect to MongoDB'
      );
    }
    mongoInitPromise = mongoose
      .connect(DB)
      .then(() => console.log('Database is successfully connected... !!!'))
      .catch((err) => {
        mongoInitPromise = undefined;
        console.error('❌ MongoDB connection error:', err);
        throw err;
      });
  }
  await mongoInitPromise;
}

let redisInitPromise;
async function initRedis() {
  // Only attempt if REDIS_URL is set; otherwise skip silently.
  if (!process.env.REDIS_URL) return;
  if (!redisInitPromise) {
    const redisClient = require('../utils/redisClient');
    redisInitPromise = redisClient.initRedis().catch((err) => {
      redisInitPromise = undefined;
      console.error('Failed to initialize Redis:', err);
      throw err;
    });
  }
  await redisInitPromise;
}

module.exports = async (req, res) => {
  await initMongo();
  await initRedis();
  return app(req, res);
};

