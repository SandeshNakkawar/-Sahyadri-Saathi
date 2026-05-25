import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './GuideDetail.css';

export default function GuideDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState({ placeId: '', startDate: '', endDate: '', numberOfTravelers: 1, specialRequests: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(`/guides/${id}`)
      .then(res => { setGuide(res.data.data.guide); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    setMessage('');

    // Client-side availability checks
    const start = new Date(bookingForm.startDate);
    const end = new Date(bookingForm.endDate);
    
    if (start > end) {
      setMessage('❌ Start date cannot be after end date.');
      setSubmitting(false);
      return;
    }

    const isAvailable = guide.availability?.some(range => {
      const rangeStart = new Date(range.startDate);
      const rangeEnd = new Date(range.endDate);
      // Strip times
      rangeStart.setHours(0,0,0,0);
      rangeEnd.setHours(23,59,59,999);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      
      return start >= rangeStart && end <= rangeEnd;
    });

    if (guide.availability?.length > 0 && !isAvailable) {
      setMessage('❌ Selected dates are outside this guide\'s scheduled operating availability. Please pick dates within their active schedule shown on their profile.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/guide-bookings', { guideProfileId: id, ...bookingForm });
      setMessage('✅ Booking request sent! The guide will review and respond.');
      setBookingForm({ placeId: '', startDate: '', endDate: '', numberOfTravelers: 1, specialRequests: '' });
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Booking failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!guide) return <div className="container section"><h2>Guide not found</h2></div>;

  return (
    <div className="guide-detail-page container section">
      <div className="guide-detail-grid">
        <div className="guide-profile-section">
          <div className="guide-profile-header card">
            <img src={`/img/guides/${guide.profilePhoto}`} alt={guide.displayName} className="guide-detail-avatar"
              onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guide.displayName) + '&background=1a3c2f&color=fff&size=160'; }} />
            <div className="guide-header-info">
              <div className="flex" style={{alignItems: 'center', gap: '0.75rem'}}>
                <h1>{guide.displayName}</h1>
                <span className="badge badge-verified">✅ Verified</span>
              </div>
              <p className="text-muted">📍 {guide.baseCity}</p>
              <div className="star-rating" style={{fontSize: '1rem', marginTop: '0.5rem'}}>
                {'★'.repeat(Math.round(guide.ratingsAverage || 0))}{'☆'.repeat(5 - Math.round(guide.ratingsAverage || 0))}
                <span className="star-value" style={{fontSize: '1rem'}}>{guide.ratingsAverage?.toFixed(1)}</span>
                <span className="star-count">({guide.ratingsQuantity} reviews)</span>
              </div>
              <div className="guide-tags" style={{marginTop: '0.75rem'}}>
                {guide.languages?.map(l => <span className="tag" key={l}>🗣️ {l}</span>)}
                {guide.specialties?.map(s => <span className="tag" key={s}>🎯 {s}</span>)}
              </div>
            </div>
          </div>

          <div className="guide-section card">
            <h3>About</h3>
            <p>{guide.bio}</p>
          </div>

          <div className="guide-section card">
            <h3>Experience & Details</h3>
            <div className="detail-grid">
              <div><strong>Experience:</strong> {guide.experienceYears} years</div>
              <div><strong>Max Group:</strong> {guide.maxGroupSize} people</div>
              <div><strong>Travel Radius:</strong> {guide.travelRadiusKm} km</div>
            </div>
          </div>

          <div className="guide-section card">
            <h3>Availability Schedule</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.25rem' }}>Operating dates where this guide is open for trek bookings:</p>
            {guide.availability?.length > 0 ? (
              <div className="availability-ranges">
                {guide.availability.map((range, idx) => (
                  <div key={idx} className="availability-badge">
                    📅 {new Date(range.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })} — {new Date(range.endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ fontStyle: 'italic' }}>No availability schedules set. Please contact guide or support.</p>
            )}
          </div>

          {guide.serviceLocations?.length > 0 && (
            <div className="guide-section card">
              <h3>Places I Guide</h3>
              <div className="guide-places-list">
                {guide.serviceLocations.map(place => (
                  <span className="tag" key={place._id || place} style={{padding: '0.4rem 0.8rem'}}>
                    🏰 {place.name || 'Place'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {guide.reviews?.length > 0 && (
            <div className="guide-section card">
              <h3>Reviews</h3>
              {guide.reviews.map(review => (
                <div className="review-item" key={review._id}>
                  <div className="review-header">
                    <strong>{review.user?.name || 'Traveler'}</strong>
                    <div className="star-rating" style={{fontSize: '0.8rem'}}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                  </div>
                  <p className="text-sm">{review.review}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking Sidebar */}
        <div className="guide-booking-sidebar">
          <div className="booking-card card">
            <div className="booking-card-header">
              <span className="price-amount" style={{fontSize: '1.5rem'}}>₹{guide.pricePerDay}</span>
              <span className="price-label">/ day</span>
              {guide.halfDayPrice && <p className="text-muted text-sm">Half day: ₹{guide.halfDayPrice}</p>}
            </div>
            {user?.role === 'tourist' ? (
              <form onSubmit={handleBooking} id="booking-form">
                {message && <div className={`auth-error ${message.startsWith('✅') ? 'success-msg' : ''}`} style={message.startsWith('✅') ? {background: '#d4edda', color: '#155724', borderColor: '#c3e6cb'} : {}}>{message}</div>}
                <div className="form-group">
                  <label className="form-label">Place</label>
                  <select className="form-select" value={bookingForm.placeId} onChange={e => setBookingForm(p => ({...p, placeId: e.target.value}))} required id="booking-place">
                    <option value="">Select place</option>
                    {guide.serviceLocations?.map(p => <option key={p._id || p} value={p._id || p}>{p.name || 'Place'}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={bookingForm.startDate} onChange={e => setBookingForm(p => ({...p, startDate: e.target.value}))} required id="booking-start" />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-input" value={bookingForm.endDate} onChange={e => setBookingForm(p => ({...p, endDate: e.target.value}))} required id="booking-end" />
                </div>
                <div className="form-group">
                  <label className="form-label">Travelers</label>
                  <input type="number" className="form-input" min="1" max={guide.maxGroupSize} value={bookingForm.numberOfTravelers} onChange={e => setBookingForm(p => ({...p, numberOfTravelers: e.target.value}))} id="booking-travelers" />
                </div>
                <div className="form-group">
                  <label className="form-label">Special Requests</label>
                  <textarea className="form-textarea" value={bookingForm.specialRequests} onChange={e => setBookingForm(p => ({...p, specialRequests: e.target.value}))} rows="3" placeholder="Any special requirements..." id="booking-requests"></textarea>
                </div>
                <button type="submit" className="btn btn-accent" style={{width: '100%'}} disabled={submitting} id="booking-submit">
                  {submitting ? 'Sending...' : '📩 Send Booking Request'}
                </button>
              </form>
            ) : !user ? (
              <div className="text-center" style={{padding: 'var(--space-lg) 0'}}>
                <p className="text-muted" style={{marginBottom: 'var(--space-md)'}}>Log in to book this guide</p>
                <a href="/login" className="btn btn-primary">Log In to Book</a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
