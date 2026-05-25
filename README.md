Absolutely! Here's a **clean, professional, and polished version** of your README with the title updated to **Yatra-Karo**:

---

# Yatra-Karo – Tour Booking Platform

A full-stack Node.js application for browsing tours, authenticating users, booking trips with Stripe Checkout, writing reviews, and managing billing.

---

## **Features**

* **Tours**: Browse tours with detailed pages, images, maps, and reviews.
* **Authentication**: JWT-based login/signup, protected routes, and role-based access.
* **Bookings**: Stripe Checkout integration, webhook-based booking creation, and “My Bookings” page.
* **Billing**: Launch Stripe Customer Portal and view recent transactions.
* **Reviews**: Users can create and view reviews for each tour.
* **Security**: Implemented Helmet, rate limiting, input sanitization, and HPP protection.
* **Views**: Server-rendered Pug templates with responsive design.

---

## **Tech Stack**

* **Backend**: Node.js, Express.js, MongoDB (Mongoose)
* **Frontend**: Pug, Vanilla JavaScript, CSS
* **Payments**: Stripe Checkout + Webhooks
* **Authentication**: JWT cookies, bcrypt password hashing
* **Utilities**: Multer, Sharp, Mapbox (optional)

---

## **Project Structure**

```text
Yatra-Karo/
├─ controllers/   # auth, bookings, tours, users, views
├─ models/        # Mongoose schemas (Tour, User, Booking, Review)
├─ routes/        # API + view routes
├─ utils/         # helpers (errors, emails, features)
├─ views/         # Pug templates
├─ public/        # CSS, JS, images
├─ app.js         # Express app configuration
└─ server.js      # App bootstrap
```

---

## **Prerequisites**

* Node.js 18+
* MongoDB (local or Atlas)
* Stripe account (test mode is sufficient)

---

## **Quick Start**

```bash
# 1) Install dependencies
npm install

# 2) Configure environment variables
cp .env.example .env   # then update values

# 3) Start development server
npm run dev

# 4) Open the app
http://localhost:3000
```

---

## **Environment Variables (.env example)**

```env
NODE_ENV=development
PORT=3000
DATABASE=mongodb://127.0.0.1:27017/yatra-karo
DATABASE_PASSWORD=        # for Atlas if needed

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

EMAIL_FROM=Your Name <you@example.com>
EMAIL_USERNAME=           # optional for SMTP
EMAIL_PASSWORD=
EMAIL_HOST=
EMAIL_PORT=

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## **Stripe Setup**

* Products are created dynamically via Checkout `line_items`.
* Success redirect: `/my-bookings?alert=booking&session_id={CHECKOUT_SESSION_ID}`.
* For local dev, if webhooks are blocked, `/my-bookings` creates booking using `session_id`.

---

### **Webhook Configuration**

* Endpoint: `/webhook-checkout` (requires raw body parsing)
* Set `STRIPE_WEBHOOK_SECRET` from Stripe dashboard

**Local testing with Stripe CLI:**

```bash
# 1) Forward events
stripe listen --forward-to http://localhost:3000/webhook-checkout

# 2) Copy displayed signing secret to STRIPE_WEBHOOK_SECRET
```

---

## **Scripts**

```bash
npm run start       # start in production
npm run dev         # start with nodemon
npm run build       # optional bundling pipeline if used
```

---

## **Key Routes**

**Views:**

* `/` – Overview of tours
* `/tour/:slug` – Tour detail page
* `/login` – Authentication
* `/my-bookings` – User bookings
* `/billing` – Stripe Customer Portal + transactions

**API:**

* `/api/v1/bookings/checkout-session/:tourId` – Create Stripe Checkout session
* `/api/v1/bookings/billing-portal` – Open Stripe Customer Portal
* `/webhook-checkout` – Stripe webhook endpoint
* `/api/v1/tours`, `/users`, `/reviews` – REST endpoints

---

## **Development Notes**

* Webhook route registered **before JSON parsing** in `app.js` to preserve raw body.
* Booking creation uses `session.amount_total` (cents) from Stripe Checkout.
* Booking population includes `slug`, `imageCover`, `duration`, and `price` for frontend rendering.

---

## **Deployment Tips**

* Set all environment variables in your hosting provider (Render, Heroku, Railway).
* Configure Stripe webhook URLs for production and development.
* Serve over HTTPS in production for Stripe security.

---

Built as an educational project inspired by the YatraKaro app idea.


