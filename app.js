const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

// Route imports
const userRouter = require('./routes/userRoutes');
const placeRouter = require('./routes/placeRoutes');
const guideProfileRouter = require('./routes/guideProfileRoutes');
const guideBookingRouter = require('./routes/guideBookingRoutes');
const paymentRouter = require('./routes/paymentRoutes');
const payoutRequestRouter = require('./routes/payoutRequestRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const adminRouter = require('./routes/adminRoutes');
const conversationRouter = require('./routes/conversationRoutes');

// Payment webhook controller (needs raw body)
const paymentController = require('./controllers/paymentController');

const app = express();

// Keep Pug available for email templates
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES

// Stripe webhook must be BEFORE body parser, and use raw body
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  paymentController.webhookCheckout
);

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend static assets if built
const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
if (require('fs').existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 200,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
};
app.use(cors(corsOptions));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'category',
      'difficultyLevel',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'pricePerDay',
      'featured',
      'status',
      'verificationStatus'
    ]
  })
);

// Request timestamp middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 2) API ROUTES
app.use('/api/v1/users', userRouter);
app.use('/api/v1/places', placeRouter);
app.use('/api/v1/guides', guideProfileRouter);
app.use('/api/v1/guide-profiles', guideProfileRouter);
app.use('/api/v1/guide-bookings', guideBookingRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/payout-requests', payoutRequestRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/conversations', conversationRouter);

// 3) Catch-all for React Frontend / API 404s
app.all('*', (req, res, next) => {
  // If request is for an API route, return 404
  if (req.originalUrl.startsWith('/api')) {
    return next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  }

  // Otherwise, serve the React app index.html if built
  const indexHtmlPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
  if (require('fs').existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }

  // Fallback if frontend is not built
  next(new AppError(`Can't find ${req.originalUrl} on this server! (Frontend not built: run "npm run build" in frontend directory)`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
