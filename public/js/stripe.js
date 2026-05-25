/* eslint-disable */
// stripe.js — No longer used for booking.
// The booking flow is handled entirely by the inline script in tour.pug
// which sends startDateId and guests via POST.
//
// This module is kept as a no-op so that index.js doesn't break if it
// still imports bookTour. The export does nothing.

export const bookTour = async tourId => {
  // No-op: booking is now handled by the inline handler in tour.pug
  // which sends startDateId + guests via POST to /api/v1/bookings/checkout-session/:tourId
  console.warn(
    'bookTour() from stripe.js is deprecated. The inline handler in tour.pug handles checkout.'
  );
};
