import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import './PlaceDetail.css'; // Borrow details formatting

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('tourist');

  useEffect(() => {
    fetchBookingDetails();
    const role = JSON.parse(localStorage.getItem('user'))?.role || 'tourist';
    setUserRole(role);
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      const res = await api.get(`/guide-bookings/${id}`);
      setBooking(res.data.data.booking);
    } catch (err) {
      console.error('Failed to load booking details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/payments/create-checkout-session/${booking._id}`);
      window.location.href = res.data.session.url;
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initialize payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p>Loading booking credentials...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container section text-center">
        <h2>Booking Not Found</h2>
        <p className="text-muted">The requested booking records could not be retrieved.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Return Home</Link>
      </div>
    );
  }

  const isTourist = userRole === 'tourist';
  const partnerName = isTourist ? booking.guideProfile?.displayName : booking.tourist?.name;
  const partnerPhoto = isTourist ? booking.guideProfile?.profilePhoto : booking.tourist?.photo;
  const partnerPhone = isTourist ? booking.guideProfile?.user?.phone || 'N/A' : booking.tourist?.phone || 'N/A';

  return (
    <div className="container section animate-fade-in" style={{ maxWidth: '800px' }}>
      <div className="card card-glass" style={{ padding: '2.5rem' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div className="flex flex-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <span className="text-accent" style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Booking ID: ...{booking._id.slice(-8)}
              </span>
              <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', marginTop: '0.25rem' }}>
                Trek at {booking.place?.name}
              </h1>
            </div>
            <div className="flex gap-sm" style={{ alignItems: 'center' }}>
              <span className={`status-dot status-${booking.status}`}></span>
              <strong style={{ textTransform: 'capitalize' }}>{booking.status.replace('_', ' ')}</strong>
            </div>
          </div>
        </div>

        {/* Timeline Status Progress */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', position: 'relative',
          marginBottom: '3rem', padding: '0 1rem'
        }}>
          {/* Background progress line */}
          <div style={{
            position: 'absolute', top: '12px', left: '2rem', right: '2rem',
            height: '3px', background: 'var(--color-border)', zIndex: 1
          }}>
            <div style={{
              height: '100%', background: 'var(--color-success)',
              width: booking.status === 'pending' ? '0%' : booking.status === 'accepted' ? '33%' : ['confirmed', 'in_progress'].includes(booking.status) ? '66%' : '100%',
              transition: 'width 0.3s ease'
            }}></div>
          </div>

          {/* Node 1 */}
          <div className="text-center" style={{ zIndex: 2, position: 'relative' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: 'var(--color-success)', color: 'white', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', fontSize: '0.75rem'
            }}>✓</div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Requested</span>
          </div>

          {/* Node 2 */}
          <div className="text-center" style={{ zIndex: 2, position: 'relative' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: ['accepted', 'confirmed', 'in_progress', 'completed'].includes(booking.status) ? 'var(--color-success)' : 'var(--color-border)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', fontSize: '0.75rem'
            }}>
              {['accepted', 'confirmed', 'in_progress', 'completed'].includes(booking.status) ? '✓' : '2'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Accepted</span>
          </div>

          {/* Node 3 */}
          <div className="text-center" style={{ zIndex: 2, position: 'relative' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: ['confirmed', 'in_progress', 'completed'].includes(booking.status) ? 'var(--color-success)' : 'var(--color-border)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', fontSize: '0.75rem'
            }}>
              {['confirmed', 'in_progress', 'completed'].includes(booking.status) ? '✓' : '3'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Confirmed</span>
          </div>

          {/* Node 4 */}
          <div className="text-center" style={{ zIndex: 2, position: 'relative' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: booking.status === 'completed' ? 'var(--color-success)' : 'var(--color-border)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', fontSize: '0.75rem'
            }}>
              {booking.status === 'completed' ? '✓' : '4'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Completed</span>
          </div>
        </div>

        {/* Layout details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          
          {/* Reservation stats */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>
              🎒 Trek Details
            </h3>
            <table style={{ width: '100%', fontSize: '0.95rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}><strong>Date:</strong></td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{new Date(booking.startDate).toLocaleDateString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}><strong>Duration:</strong></td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{booking.numberOfDays} Day(s)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}><strong>Travelers:</strong></td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{booking.numberOfTravelers} Guest(s)</td>
                </tr>
                {booking.meetingPoint && (
                  <tr>
                    <td style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}><strong>Meeting point:</strong></td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '0.85rem' }}>{booking.meetingPoint}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {booking.specialRequests && (
              <div style={{
                marginTop: '1.5rem', padding: '1rem',
                background: 'var(--color-stone)', borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem', fontStyle: 'italic', borderLeft: '3px solid var(--color-accent)'
              }}>
                <strong>Special Request:</strong> "{booking.specialRequests}"
              </div>
            )}
          </div>

          {/* Partner profile */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>
              🧭 {isTourist ? 'Your Local Guide' : 'Tourist Details'}
            </h3>
            {partnerName ? (
              <div className="card-glass" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'var(--color-stone)' }}>
                <img 
                  src={isTourist ? `/img/guides/${partnerPhoto || 'default.jpg'}` : `/img/users/${partnerPhoto || 'default.jpg'}`}
                  onError={(e) => { e.target.src = '/img/users/default.jpg'; }}
                  alt={partnerName}
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
                <div>
                  <h4 style={{ color: 'var(--color-primary-dark)' }}>{partnerName}</h4>
                  <p className="text-muted text-sm" style={{ margin: '0.25rem 0' }}>📞 {partnerPhone}</p>
                  <Link to={isTourist ? `/guides/${booking.guideProfile?._id}` : '#'} className="text-accent text-sm" style={{ fontWeight: 600 }}>
                    {isTourist ? 'View Profile →' : 'Verified Tourist'}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-muted">Profile not linked.</p>
            )}

            {/* Price section */}
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>
                💳 Invoice Receipt
              </h3>
              <div style={{ fontSize: '0.95rem', background: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                {booking.priceSnapshot?.basePricePerDay ? (
                  <>
                    <div className="flex flex-between" style={{ padding: '0.35rem 0' }}>
                      <span>Base rate:</span>
                      <span>₹{booking.priceSnapshot.basePricePerDay}/day</span>
                    </div>
                    {booking.priceSnapshot.seasonName && (
                      <div className="flex flex-between" style={{ padding: '0.35rem 0', color: booking.priceSnapshot.seasonalMultiplier > 1 ? '#dc2626' : '#16a34a' }}>
                        <span>{booking.priceSnapshot.seasonName} ({booking.priceSnapshot.seasonalMultiplier}×):</span>
                        <span>₹{Math.round(booking.priceSnapshot.basePricePerDay * booking.priceSnapshot.seasonalMultiplier)}/day</span>
                      </div>
                    )}
                    {booking.priceSnapshot.weekendSurchargeApplied && (
                      <div className="flex flex-between" style={{ padding: '0.35rem 0', color: '#dc2626', fontSize: '0.85rem' }}>
                        <span>Saturday surcharge (+{booking.priceSnapshot.weekendSurchargePercent}%):</span>
                        <span>Applied</span>
                      </div>
                    )}
                    {booking.priceSnapshot.advanceDiscountApplied && (
                      <div className="flex flex-between" style={{ padding: '0.35rem 0', color: '#16a34a', fontSize: '0.85rem' }}>
                        <span>Early bird ({booking.priceSnapshot.daysBookedInAdvance}d, -{booking.priceSnapshot.advanceDiscountPercent}%):</span>
                        <span>-{booking.priceSnapshot.advanceDiscountPercent}%</span>
                      </div>
                    )}
                    <div className="flex flex-between" style={{ padding: '0.35rem 0', borderTop: '1px dashed var(--color-border)', marginTop: '0.25rem', fontWeight: 600 }}>
                      <span>Effective rate:</span>
                      <span>₹{booking.priceSnapshot.effectivePricePerDay}/day × {booking.numberOfDays} day{booking.numberOfDays > 1 ? 's' : ''}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-between" style={{ padding: '0.35rem 0' }}>
                    <span>Trek Service Fee:</span>
                    <span>₹{booking.totalPrice}</span>
                  </div>
                )}
                <div className="flex flex-between" style={{ padding: '0.35rem 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  <span>Stripe Secure Gateway:</span>
                  <span>Free</span>
                </div>
                <div className="flex flex-between" style={{ padding: '0.5rem 0 0', marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                  <span>Total Cost:</span>
                  <span>₹{booking.totalPrice}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Action Panel Footer */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <Link to={isTourist ? '/dashboard/tourist' : '/dashboard/guide'} className="btn btn-outline">
            ⬅️ Back to Dashboard
          </Link>
          
          <div className="flex gap-sm">
            {/* Coordination Chat button */}
            {['accepted', 'confirmed', 'in_progress', 'completed'].includes(booking.status) && (
              <Link to={`/chat/${booking._id}`} className="btn btn-primary">
                💬 Chat Coordinator
              </Link>
            )}

            {/* Tourist Payment button */}
            {isTourist && booking.status === 'accepted' && (
              <button 
                onClick={handlePayment} 
                className="btn btn-accent" 
                disabled={submitting}
              >
                {submitting ? 'Initializing Checkout...' : '💳 Proceed to Payment'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
