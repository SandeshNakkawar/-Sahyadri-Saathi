import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './Dashboard.css';

export default function TouristDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  // Review Modal State
  const [reviewedBookings, setReviewedBookings] = useState(new Set());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [tab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = tab !== 'all' ? { status: tab } : {};
      const bookingsRes = await api.get('/guide-bookings/my-bookings', { params });
      setBookings(bookingsRes.data.data.bookings || []);

      // Get logged in user details to filter reviews
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userId = JSON.parse(userStr).id;
        const reviewsRes = await api.get(`/reviews?user=${userId}`);
        const reviewedIds = new Set(
          (reviewsRes.data.data.data || []).map(r => r.booking?._id || r.booking)
        );
        setReviewedBookings(reviewedIds);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmComplete = async (id) => {
    try {
      await api.patch(`/guide-bookings/${id}/tourist-confirm-complete`);
      alert('Trek marked completed successfully!');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete trip');
    }
  };

  const handlePay = async (id) => {
    try {
      const res = await api.post(`/payments/create-checkout-session/${id}`);
      window.location.href = res.data.session.url;
    } catch (err) {
      alert(err.response?.data?.message || 'Payment initiation failed');
    }
  };

  const handleCancel = async (id) => {
    const reason = window.prompt('Optional: Why are you cancelling this booking?');
    if (reason === null) return; // user clicked Cancel on prompt
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;
    try {
      await api.patch(`/guide-bookings/${id}/cancel`, { reason: reason || 'Cancelled by tourist' });
      alert('Booking cancelled successfully.');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const openReviewModal = (booking) => {
    setSelectedBooking(booking);
    setRating(5);
    setReviewText('');
    setShowReviewModal(true);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return alert('Please enter review comment');
    
    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        booking: selectedBooking._id,
        rating,
        review: reviewText.trim()
      });
      alert('Thank you! Review submitted successfully.');
      setShowReviewModal(false);
      
      // Refresh reviewed list
      setReviewedBookings(prev => {
        const next = new Set(prev);
        next.add(selectedBooking._id);
        return next;
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="dashboard-page container section animate-fade-in">
      <div className="dashboard-header flex flex-between">
        <div>
          <h1>Tourist Dashboard</h1>
          <p className="text-muted">Explore Maharashtra with your verified local guide companions</p>
        </div>
      </div>

      <div className="dash-tabs">
        {['all', 'pending', 'accepted', 'confirmed', 'in_progress', 'completed'].map(t => (
          <button key={t} className={`dash-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'All Treks' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-page">
          <div className="spinner"></div>
        </div>
      ) : bookings.length === 0 ? (
        <p className="text-muted" style={{ padding: '2rem 0' }}>No bookings found in this section.</p>
      ) : (
        <div className="bookings-list">
          {bookings.map(booking => {
            const hasReviewed = reviewedBookings.has(booking._id);
            return (
              <div className="booking-item card" key={booking._id}>
                <div className="booking-item-header">
                  <div>
                    <h4>{booking.place?.name || 'Place'}</h4>
                    <p className="text-muted text-sm">
                      Saathi: <strong>{booking.guideProfile?.displayName || 'Local Guide'}</strong>
                    </p>
                  </div>
                  <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                    <span className={`status-dot status-${booking.status}`}></span>
                    <span className="text-sm" style={{ textTransform: 'capitalize' }}>
                      {booking.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="booking-item-details">
                  <div>
                    <strong>Dates:</strong> {new Date(booking.startDate).toLocaleDateString()} — {new Date(booking.endDate).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Travelers:</strong> {booking.numberOfTravelers} Guest(s)
                  </div>
                  <div>
                    <strong>Total Cost:</strong> ₹{booking.totalPrice}
                  </div>
                  <div>
                    <strong>Payment:</strong> <span className={`status-dot status-${booking.paymentStatus}`}></span>{booking.paymentStatus}
                  </div>
                </div>

                <div className="booking-item-actions">
                  {/* Detailed summary page */}
                  <Link to={`/booking/${booking._id}`} className="btn btn-outline btn-sm">
                    🔍 Booking Details
                  </Link>

                  {/* Stripe Payment */}
                  {booking.status === 'accepted' && booking.paymentStatus === 'unpaid' && (
                    <button onClick={() => handlePay(booking._id)} className="btn btn-accent btn-sm">
                      💳 Secure Checkout
                    </button>
                  )}

                  {/* Coordination Chat */}
                  {['accepted', 'confirmed', 'in_progress', 'completed'].includes(booking.status) && (
                    <Link to={`/chat/${booking._id}`} className="btn btn-primary btn-sm">
                      💬 Open Chat
                    </Link>
                  )}

                  {/* Completion Confirm */}
                  {['confirmed', 'in_progress'].includes(booking.status) && !booking.completion?.touristConfirmedCompleted && (
                    <button onClick={() => confirmComplete(booking._id)} className="btn btn-accent btn-sm">
                      ✅ Confirm Completion
                    </button>
                  )}

                  {/* Write Review */}
                  {booking.status === 'completed' && (
                    hasReviewed ? (
                      <span className="badge badge-verified">⭐ Review Submitted</span>
                    ) : (
                      <button onClick={() => openReviewModal(booking)} className="btn btn-accent btn-sm">
                        ⭐ Write Review
                      </button>
                    )
                  )}

                  {booking.completion?.touristConfirmedCompleted && !booking.completion?.guideMarkedCompleted && (
                    <span className="badge badge-pending">Waiting for guide confirmation</span>
                  )}

                  {/* Cancel Booking */}
                  {['pending', 'accepted', 'confirmed'].includes(booking.status) && (
                    <button onClick={() => handleCancel(booking._id)} className="btn btn-outline btn-sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                      ❌ Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card-glass" style={{
            background: 'var(--color-surface)', padding: '2.5rem',
            borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '90%'
          }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-primary-dark)', fontFamily: 'var(--font-heading)' }}>
              Rate your Maharashtra Saathi
            </h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
              Your feedback helps keep Sahyadri Saathi safe, friendly, and reliable for all trekkers.
            </p>

            <form onSubmit={submitReview}>
              <div className="form-group">
                <label className="form-label">Trek Rating</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '1.75rem', color: star <= rating ? '#c9a84c' : 'var(--color-border)',
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1.0)'; }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Review Comment</label>
                <textarea
                  placeholder="Share details of your experience! Was the guide knowledgeable about history? Were safety measures followed? How was the food?"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="form-textarea"
                  rows={4}
                  required
                />
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowReviewModal(false)} className="btn btn-ghost btn-sm" disabled={submittingReview}>Cancel</button>
                <button type="submit" className="btn btn-accent btn-sm" disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
