# 🏔️ Sahyadri Saathi

**A full-stack local guide booking marketplace for Maharashtra's forts, treks, and heritage experiences.**

Sahyadri Saathi connects travelers with verified local guides across the Western Ghats (Sahyadri) region. Tourists can browse historical forts and places, discover experienced guides, book treks with secure Stripe payments, and coordinate trips via in-app chat — all within a single platform.

---

## ✨ Key Features

### 🧭 For Tourists
- **Browse Places** — Explore Maharashtra's legendary forts, treks, and heritage sites with rich history, difficulty ratings, and entry fees
- **Find Guides** — Filter verified local guides by location, language, specialty, rating, and price
- **Book a Trek** — Send booking requests with dates, group size, meeting points, and special requests
- **Secure Payments** — Pay via Stripe checkout with full escrow protection (money released only after trip confirmation)
- **In-App Chat** — Coordinate directly with your guide before and during the trek
- **Rate & Review** — Leave reviews after completed trips to help the community

### 🧗 For Guides
- **Onboarding Wizard** — Multi-step profile setup: bio, skills, languages, pricing, service locations, and document upload
- **Document Verification** — Upload ID proof, address proof, and optional certificates for admin review
- **Booking Management** — Accept/reject requests, start trips, and mark completions from a dedicated dashboard
- **Chat with Tourists** — Real-time messaging with booking-linked conversations
- **UPI Payout Requests** — Request earnings via UPI after trip completion (85% guide / 15% platform split)
- **Earnings & Reviews Tracking** — View total earnings, completed trips, and rating statistics

### 🛡️ For Admins
- **Overview Dashboard** — Revenue analytics, total bookings, registered users, and alert panels
- **Guide Verification** — Review pending guide applications, view private documents securely, approve or reject with feedback
- **Payout Processing** — View UPI payout requests, mark as paid with transaction references, hold or reject
- **Bookings Monitor** — View all marketplace bookings across all guides and tourists
- **Places Management** — Full CRUD operations to add, edit, or remove forts/treks with cover image uploads

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js |
| **Frontend** | React 19, React Router v7, Vite 8 |
| **Database** | MongoDB with Mongoose ODM |
| **Payments** | Stripe Checkout (INR) |
| **Auth** | JWT (JSON Web Tokens) with HTTP-only cookies |
| **File Uploads** | Multer + Sharp (image processing) |
| **Email** | Nodemailer with Pug templates |
| **Caching** | Redis (optional, graceful fallback) |
| **Scheduling** | node-cron (trip reminders, review requests) |
| **Security** | Helmet, express-rate-limit, mongo-sanitize, XSS-clean, HPP |
| **Containerization** | Docker |

---

## 📁 Project Structure

```
sahyadri-saathi/
├── app.js                    # Express app configuration & middleware
├── server.js                 # Server entry point, DB connection, Redis, cron
├── Dockerfile                # Production Docker image
│
├── controllers/              # Request handlers
│   ├── adminController.js    # Dashboard stats, revenue, all-entities queries
│   ├── authController.js     # Signup, login, JWT, password reset
│   ├── conversationController.js  # Chat conversations & messaging
│   ├── guideBookingController.js  # Booking CRUD & lifecycle management
│   ├── guideProfileController.js  # Guide onboarding, verification, admin actions
│   ├── paymentController.js  # Stripe checkout sessions & webhooks
│   ├── payoutRequestController.js # UPI payout request lifecycle
│   ├── placeController.js    # Places/forts CRUD with image upload
│   ├── reviewController.js   # Rating & review system
│   └── userController.js     # User profile management
│
├── models/                   # Mongoose schemas
│   ├── userModel.js          # User (tourist/guide/admin) with auth
│   ├── guideProfileModel.js  # Guide profile, verification, documents
│   ├── guideBookingModel.js  # Booking with commission & completion tracking
│   ├── placeModel.js         # Places/forts with geolocation
│   ├── reviewModel.js        # Reviews linked to guides & bookings
│   ├── payoutRequestModel.js # UPI payout lifecycle
│   └── conversationModel.js  # Chat conversations & messages
│
├── routes/                   # Express route definitions
│   ├── adminRoutes.js
│   ├── guideProfileRoutes.js
│   ├── guideBookingRoutes.js
│   ├── conversationRoutes.js
│   ├── paymentRoutes.js
│   ├── payoutRequestRoutes.js
│   ├── placeRoutes.js
│   ├── reviewRoutes.js
│   └── userRoutes.js
│
├── frontend/                 # React SPA (Vite)
│   └── src/
│       ├── api/axios.js      # Axios instance with base URL
│       ├── context/AuthContext.jsx  # Auth state management
│       ├── components/       # Navbar, Footer, Layout, ProtectedRoute
│       └── pages/            # All page components
│           ├── Home.jsx
│           ├── PlacesList.jsx / PlaceDetail.jsx
│           ├── GuidesList.jsx / GuideDetail.jsx
│           ├── GuideOnboarding.jsx
│           ├── GuideDashboard.jsx
│           ├── TouristDashboard.jsx
│           ├── AdminDashboard.jsx
│           ├── BookingDetail.jsx / BookingSuccess.jsx
│           ├── Chat.jsx
│           ├── Login.jsx / Signup.jsx
│           └── *.css
│
├── utils/                    # Helpers & utilities
│   ├── appError.js           # Custom error class
│   ├── catchAsync.js         # Async error wrapper
│   ├── email.js              # Email sending with Pug templates
│   ├── redisClient.js        # Redis connection (optional)
│   └── scheduledTasks.js     # Cron jobs for reminders
│
├── views/email/              # Pug email templates
├── scripts/                  # Seed & utility scripts
├── private/                  # Private document uploads (not publicly accessible)
└── public/                   # Static assets (images, CSS)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **MongoDB** (local or Atlas cloud)
- **Stripe Account** (for payments - [dashboard.stripe.com](https://dashboard.stripe.com))
- **Redis** (optional — app works without it)

### 1. Clone the Repository

```bash
git clone https://github.com/SandeshNakkawar/-Sahyadri-Saathi.git
cd -Sahyadri-Saathi
```

### 2. Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# MongoDB
DATABASE=mongodb+srv://<username>:<PASSWORD>@cluster.mongodb.net/SahyadriSaathi?retryWrites=true&w=majority
DATABASE_PASSWORD=your_database_password

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90d

# Stripe Payments
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CURRENCY=inr
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid / Mailtrap)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USERNAME=apikey
EMAIL_PASSWORD=your_email_api_key
EMAIL_FROM=notifications@sahyadrisaathi.com

# Platform Commission
PLATFORM_COMMISSION_RATE=0.15
```

### 4. Seed the Database

Populate the database with sample places, guides, tourists, bookings, and reviews:

```bash
npm run seed
```

### 5. Build the Frontend

```bash
cd frontend
npm run build
cd ..
```

### 6. Start the Server

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

The app will be available at **http://localhost:3000**

---

## 🔑 Test Credentials

After running `npm run seed`, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@sahyadrisaathi.com` | `admin1234` |
| **Guide** | `rajesh@example.com` | `guide1234` |
| **Guide** | `priya@example.com` | `guide1234` |
| **Tourist** | `aarav@example.com` | `tourist1234` |
| **Tourist** | `meera@example.com` | `tourist1234` |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/users/signup` | Register a new user |
| `POST` | `/api/v1/users/login` | Login with email & password |
| `GET` | `/api/v1/users/logout` | Logout (clear cookie) |
| `POST` | `/api/v1/users/forgotPassword` | Request password reset |
| `PATCH` | `/api/v1/users/resetPassword/:token` | Reset password |

### Places
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/places` | Get all active places |
| `GET` | `/api/v1/places/:slug` | Get place by slug |
| `POST` | `/api/v1/places` | Create place *(admin)* |
| `PATCH` | `/api/v1/places/:id` | Update place *(admin)* |
| `DELETE` | `/api/v1/places/:id` | Delete place *(admin)* |

### Guide Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/guide-profiles` | Browse approved public guides |
| `GET` | `/api/v1/guide-profiles/:id` | View guide detail |
| `GET` | `/api/v1/guide-profiles/me` | Get own profile *(guide)* |
| `POST` | `/api/v1/guide-profiles/onboarding` | Create/update profile *(guide)* |
| `POST` | `/api/v1/guide-profiles/submit-verification` | Submit for verification *(guide)* |
| `GET` | `/api/v1/guide-profiles/admin/pending` | List pending guides *(admin)* |
| `PATCH` | `/api/v1/guide-profiles/admin/:id/approve` | Approve guide *(admin)* |
| `PATCH` | `/api/v1/guide-profiles/admin/:id/reject` | Reject guide *(admin)* |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/guide-bookings` | Create booking request *(tourist)* |
| `GET` | `/api/v1/guide-bookings/my-bookings` | Tourist's bookings *(tourist)* |
| `GET` | `/api/v1/guide-bookings/guide-requests` | Guide's booking requests *(guide)* |
| `GET` | `/api/v1/guide-bookings/:id` | Get booking detail |
| `PATCH` | `/api/v1/guide-bookings/:id/accept` | Accept booking *(guide)* |
| `PATCH` | `/api/v1/guide-bookings/:id/reject` | Reject booking *(guide)* |
| `PATCH` | `/api/v1/guide-bookings/:id/start-trip` | Start trip *(guide)* |
| `PATCH` | `/api/v1/guide-bookings/:id/guide-mark-complete` | Guide marks complete *(guide)* |
| `PATCH` | `/api/v1/guide-bookings/:id/tourist-confirm-complete` | Tourist confirms *(tourist)* |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/payments/create-checkout-session/:bookingId` | Create Stripe session *(tourist)* |
| `POST` | `/webhook-checkout` | Stripe webhook (raw body) |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/conversations/me` | Get my conversations |
| `GET` | `/api/v1/conversations/booking/:bookingId` | Get/create chat for booking |
| `POST` | `/api/v1/conversations/:id/message` | Send a message |
| `PATCH` | `/api/v1/conversations/:id/read` | Mark messages as read |

### Admin Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/dashboard` | Platform stats & analytics |
| `GET` | `/api/v1/admin/bookings` | All bookings |
| `GET` | `/api/v1/admin/revenue` | Monthly revenue report |
| `GET` | `/api/v1/admin/users` | All users |
| `GET` | `/api/v1/admin/payouts` | All payout requests |

### Payout Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/payout-requests/:bookingId` | Request payout *(guide)* |
| `GET` | `/api/v1/payout-requests/my-payouts` | Guide's payouts *(guide)* |
| `GET` | `/api/v1/payout-requests/admin` | All payouts *(admin)* |
| `PATCH` | `/api/v1/payout-requests/:id/mark-paid` | Mark paid *(admin)* |
| `PATCH` | `/api/v1/payout-requests/:id/hold` | Put on hold *(admin)* |
| `PATCH` | `/api/v1/payout-requests/:id/reject` | Reject payout *(admin)* |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/reviews` | Create review *(tourist)* |
| `GET` | `/api/v1/reviews` | Get all reviews |

---

## 🔄 Booking Lifecycle

```
Tourist sends request     Guide reviews
      │                       │
      ▼                       ▼
   PENDING ──────────►  ACCEPTED / REJECTED
                            │
                            ▼
                    Tourist pays via Stripe
                            │
                            ▼
                        CONFIRMED
                            │
                            ▼
                   Guide starts trip
                            │
                            ▼
                      IN_PROGRESS
                            │
                    ┌───────┴───────┐
                    ▼               ▼
            Guide marks       Tourist confirms
            complete          complete
                    │               │
                    └───────┬───────┘
                            ▼
                        COMPLETED
                            │
                            ▼
                  Guide requests UPI payout
                            │
                            ▼
                  Admin transfers & confirms
```

---

## 💰 Commission Model

| Component | Percentage |
|-----------|-----------|
| Guide Payout | **85%** of booking total |
| Platform Fee | **15%** of booking total |

The platform collects 100% of the payment upfront. After both the guide and tourist confirm trip completion, the guide can request a payout via UPI. The admin manually transfers the funds and records the transaction reference.

---

## 🐳 Docker Deployment

```bash
# Build the image
docker build -t sahyadri-saathi .

# Run the container
docker run -p 5000:5000 --env-file .env sahyadri-saathi
```

---

## 🔒 Security Features

- **JWT Authentication** with HTTP-only secure cookies
- **Password Hashing** with bcryptjs (12 salt rounds)
- **Rate Limiting** — 200 requests per hour per IP
- **Data Sanitization** — NoSQL injection & XSS protection
- **Parameter Pollution** prevention with HPP
- **Helmet** security headers
- **Private Document Storage** — Verification documents stored outside public directory
- **UPI Privacy** — Temporary UPI IDs cleared after admin payout processing
- **Role-Based Access Control** — Tourist, Guide, and Admin permission layers

---

## 📜 License

ISC

---

## 👤 Author

**Sandesh Nakkawar**

- GitHub: [@SandeshNakkawar](https://github.com/SandeshNakkawar)

---

<p align="center">
  <strong>🏔️ Sahyadri Saathi — Explore Maharashtra with a Trusted Guide</strong><br/>
  <em>Not just another tour package — a guide who becomes your friend.</em>
</p>
