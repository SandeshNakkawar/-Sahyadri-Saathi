import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    async function confirmPayment() {
      if (!sessionId) {
        setLoading(false);
        setError('Missing Stripe Checkout Session ID');
        return;
      }

      try {
        // Trigger fallback API to confirm payment on backend (crucial for dev)
        await api.get(`/payments/confirm-fallback?sessionId=${sessionId}`);
        
        // Fetch the booking details
        const bookingRes = await api.get(`/guide-bookings/${bookingId}`);
        setBooking(bookingRes.data.data.booking);
        setSuccess(true);
      } catch (err) {
        console.error('Confirmation error:', err);
        setError(err.response?.data?.message || 'Failed to verify booking payment');
      } finally {
        setLoading(false);
      }
    }

    confirmPayment();
  }, [sessionId, bookingId]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p>Verifying your booking payment secure transaction...</p>
      </div>
    );
  }

  return (
    <div className="container section flex flex-center" style={{ minHeight: '80vh', flexDirection: 'column' }}>
      <div className="card card-glass text-center" style={{ maxWidth: '540px', width: '95%', padding: '3rem var(--space-xl)' }}>
        {success ? (
          <div className="animate-fade-in">
            <div style={{ fontSize: '4.5rem', color: 'var(--color-success)', marginBottom: '1rem' }}>
              🎉
            </div>
            
            <h1 style={{ color: 'var(--color-primary-dark)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
              Trek Booking Confirmed!
            </h1>
            
            <p className="text-accent" style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '2rem' }}>
              Your saathi is ready. Sahyadri awaits you!
            </p>

            {booking && (
              <div style={{
                background: 'var(--color-stone)',
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                textAlign: 'left',
                marginBottom: '2.5rem',
                color: 'var(--color-primary-dark)'
              }}>
                <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>
                  Booking Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.95rem' }}>
                  <div><strong>Location:</strong></div>
                  <div>{booking.place?.name || 'Maharashtra'}</div>
                  
                  <div><strong>Dates:</strong></div>
                  <div>{new Date(booking.startDate).toLocaleDateString()}</div>
                  
                  <div><strong>Group Size:</strong></div>
                  <div>{booking.numberOfTravelers} Guest(s)</div>
                  
                  <div><strong>Total Paid:</strong></div>
                  <div style={{ color: 'var(--color-success)', fontWeight: 700 }}>₹{booking.totalPrice}</div>
                </div>
                {booking.meetingPoint && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                    📍 <strong>Meeting Point:</strong> {booking.meetingPoint}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link to="/dashboard/tourist" className="btn btn-accent btn-lg" style={{ width: '100%' }}>
                🎒 Go to Tourist Dashboard
              </Link>
              {booking && (
                <Link to={`/chat/${booking._id}`} className="btn btn-primary" style={{ width: '100%' }}>
                  💬 Chat with your Guide Now
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div style={{ fontSize: '4.5rem', color: 'var(--color-danger)', marginBottom: '1rem' }}>
              ⚠️
            </div>
            
            <h1 style={{ color: 'var(--color-danger)', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>
              Verification Failed
            </h1>
            
            <p className="text-muted" style={{ marginBottom: '2.5rem', lineHeight: 1.6 }}>
              {error || 'We could not verify your checkout session. If you received a confirmation email, your payment is secure and active.'}
            </p>

            <Link to="/dashboard/tourist" className="btn btn-outline" style={{ width: '100%' }}>
              Return to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
