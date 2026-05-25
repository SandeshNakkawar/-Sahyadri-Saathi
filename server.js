const dotenv = require('dotenv');
dotenv.config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const mongoose = require('mongoose');
const app = require('./app');
//const retryService = require('./services/retryService');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect(DB).then( (con) => {
  console.log("Database is successfully connected... !!!")
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});


const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`🏔️  Sahyadri Saathi running on port ${port}...`);
});

// Initialize Redis connection
const redisClient = require('./utils/redisClient');
redisClient.initRedis().catch(err => {
  console.error('Failed to initialize Redis:', err);
});

// Start scheduled tasks (trip reminders, review requests, auto-complete)
const { startScheduledTasks, stopScheduledTasks } = require('./utils/scheduledTasks');
startScheduledTasks();

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  stopScheduledTasks();
  await redisClient.closeRedis();
  server.close(() => {
    console.log('Process terminated');
  });
});
