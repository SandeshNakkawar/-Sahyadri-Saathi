import { useState, useEffect, useMemo } from 'react';
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

  // Availability calendar
  const [blockedDates, setBlockedDates] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Price preview (server-side)
  const [pricePreview, setPricePreview] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/guides/${id}`),
      api.get(`/guide-bookings/guide/${id}/blocked-dates`)
    ]).then(([guideRes, blockedRes]) => {
      setGuide(guideRes.data.data.guide);
      setBlockedDates(blockedRes.data.data.blockedDates || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // Fetch price preview when dates change
  useEffect(() => {
    if (!bookingForm.startDate || !bookingForm.endDate) {
      setPricePreview(null);
      return;
    }
    const start = new Date(bookingForm.startDate);
    const end = new Date(bookingForm.endDate);
    if (end < start) return;
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    setLoadingPrice(true);
    api.get(`/guides/${id}/price-preview?startDate=${bookingForm.startDate}&numberOfDays=${days}`)
      .then(res => setPricePreview(res.data.data))
      .catch(() => setPricePreview(null))
      .finally(() => setLoadingPrice(false));
  }, [bookingForm.startDate, bookingForm.endDate, id]);

  // ─── Calendar helpers ─────────────────────────────────────────
  const isDateBlocked = (date) => {
    return blockedDates.some(b => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      bStart.setHours(0,0,0,0);
      bEnd.setHours(23,59,59,999);
      return date >= bStart && date <= bEnd;
    });
  };

  const isDateInAvailability = (date) => {
    if (!guide?.availability || guide.availability.length === 0) return true;
    return guide.availability.some(range => {
      const rStart = new Date(range.startDate);
      const rEnd = new Date(range.endDate);
      rStart.setHours(0,0,0,0);
      rEnd.setHours(23,59,59,999);
      return date >= rStart && date <= rEnd;
    });
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sunday
    const days = [];

    // Pad empty cells for days before the 1st
    for (let i = 0; i < startPad; i++) days.push(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calendarYear, calendarMonth, d);
      const today = new Date();
      today.setHours(0,0,0,0);
      const isPast = date < today;
      const blocked = isDateBlocked(date);
      const inAvailability = isDateInAvailability(date);
      days.push({ day: d, date, isPast, blocked, inAvailability });
    }
    return days;
  }, [calendarMonth, calendarYear, blockedDates, guide]);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // ─── Blocked date validation ──────────────────────────────────
  const checkBlockedOverlap = (startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const s = new Date(startStr); s.setHours(0,0,0,0);
    const e = new Date(endStr); e.setHours(23,59,59,999);
    return blockedDates.some(b => {
      const bS = new Date(b.startDate); bS.setHours(0,0,0,0);
      const bE = new Date(b.endDate); bE.setHours(23,59,59,999);
      return s <= bE && e >= bS;
    });
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    setMessage('');

    const start = new Date(bookingForm.startDate);
    const end = new Date(bookingForm.endDate);

    if (start > end) {
      setMessage('❌ Start date cannot be after end date.');
      setSubmitting(false);
      return;
    }

    // Check blocked dates
    if (checkBlockedOverlap(bookingForm.startDate, bookingForm.endDate)) {
      setMessage('❌ Your selected dates overlap with an existing booking for this guide. Please choose different dates.');
      setSubmitting(false);
      return;
    }

    // Check availability window
    const isAvailable = guide.availability?.some(range => {
      const rangeStart = new Date(range.startDate);
      const rangeEnd = new Date(range.endDate);
      rangeStart.setHours(0,0,0,0);
      rangeEnd.setHours(23,59,59,999);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return start >= rangeStart && end <= rangeEnd;
    });

    if (guide.availability?.length > 0 && !isAvailable) {
      setMessage('❌ Selected dates are outside this guide\'s scheduled operating availability.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/guide-bookings', { guideProfileId: id, ...bookingForm });
      setMessage('✅ Booking request sent! The guide will review and respond.');
      setBookingForm({ placeId: '', startDate: '', endDate: '', numberOfTravelers: 1, specialRequests: '' });
      // Refresh blocked dates
      const blockedRes = await api.get(`/guide-bookings/guide/${id}/blocked-dates`);
      setBlockedDates(blockedRes.data.data.blockedDates || []);
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

          {/* ─── Availability Calendar ─────────────────────────── */}
          <div className="guide-section card">
            <h3>📅 Availability Calendar</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4ade80', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span> Available
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px', marginLeft: '12px', marginRight: '4px', verticalAlign: 'middle' }}></span> Booked
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#d1d5db', borderRadius: '2px', marginLeft: '12px', marginRight: '4px', verticalAlign: 'middle' }}></span> Unavailable
            </p>

            {/* Calendar Navigation */}
            <div className="flex flex-between" style={{ marginBottom: '1rem', alignItems: 'center' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                  else setCalendarMonth(m => m - 1);
                }}
              >◀ Prev</button>
              <strong style={{ fontSize: '1.05rem' }}>{monthNames[calendarMonth]} {calendarYear}</strong>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                  else setCalendarMonth(m => m + 1);
                }}
              >Next ▶</button>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', textAlign: 'center' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', padding: '0.4rem 0' }}>{d}</div>
              ))}
              {calendarDays.map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`}></div>;
                const bg = cell.isPast
                  ? '#f3f4f6'
                  : cell.blocked
                    ? '#fecaca'
                    : !cell.inAvailability
                      ? '#e5e7eb'
                      : '#bbf7d0';
                const color = cell.isPast
                  ? '#9ca3af'
                  : cell.blocked
                    ? '#b91c1c'
                    : !cell.inAvailability
                      ? '#9ca3af'
                      : '#166534';
                return (
                  <div
                    key={cell.day}
                    style={{
                      padding: '0.35rem 0',
                      borderRadius: '4px',
                      background: bg,
                      color: color,
                      fontSize: '0.85rem',
                      fontWeight: cell.blocked ? 700 : 500,
                      cursor: 'default'
                    }}
                    title={cell.blocked ? 'Booked' : cell.isPast ? 'Past' : !cell.inAvailability ? 'Guide unavailable' : 'Available'}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Pricing Rules Display ─────────────────────────── */}
          {(guide.pricingRules?.length > 0 || guide.weekendSurchargePercent > 0 || guide.advanceBookingDiscount?.daysInAdvance > 0) && (
            <div className="guide-section card">
              <h3>⚡ Dynamic Pricing</h3>
              {guide.pricingRules?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong className="text-sm">Seasonal Rates:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {guide.pricingRules.map((rule, i) => (
                      <span key={i} className="tag" style={{ background: rule.multiplier > 1 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: rule.multiplier > 1 ? '#dc2626' : '#16a34a', border: `1px solid ${rule.multiplier > 1 ? '#fca5a5' : '#86efac'}` }}>
                        {rule.name}: {rule.multiplier > 1 ? `+${Math.round((rule.multiplier - 1) * 100)}%` : `${Math.round((1 - rule.multiplier) * 100)}% off`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {guide.weekendSurchargePercent > 0 && (
                <p className="text-sm" style={{ marginBottom: '0.5rem' }}>
                  📅 <strong>Weekend (Saturday):</strong> +{guide.weekendSurchargePercent}% surcharge
                </p>
              )}
              {guide.advanceBookingDiscount?.daysInAdvance > 0 && guide.advanceBookingDiscount?.discountPercent > 0 && (
                <p className="text-sm">
                  🎟️ <strong>Early Bird:</strong> Book {guide.advanceBookingDiscount.daysInAdvance}+ days early → {guide.advanceBookingDiscount.discountPercent}% off
                </p>
              )}
            </div>
          )}

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
              <span className="price-label">/ day <span className="text-muted text-sm">(base)</span></span>
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

                {/* ─── Price Preview Panel ─────────────────────── */}
                {loadingPrice && <p className="text-muted text-sm" style={{ padding: '0.5rem 0' }}>Calculating price...</p>}
                {pricePreview && !loadingPrice && (
                  <div style={{
                    background: 'var(--color-stone)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.85rem'
                  }}>
                    <div className="flex flex-between" style={{ marginBottom: '0.25rem' }}>
                      <span>Base price:</span>
                      <span>₹{pricePreview.basePricePerDay}/day</span>
                    </div>
                    {pricePreview.seasonName && (
                      <div className="flex flex-between" style={{ marginBottom: '0.25rem', color: pricePreview.seasonalMultiplier > 1 ? '#dc2626' : '#16a34a' }}>
                        <span>{pricePreview.seasonName} ({pricePreview.seasonalMultiplier}×):</span>
                        <span>₹{Math.round(pricePreview.basePricePerDay * pricePreview.seasonalMultiplier)}/day</span>
                      </div>
                    )}
                    {pricePreview.weekendSurchargeApplied && (
                      <div className="flex flex-between" style={{ marginBottom: '0.25rem', color: '#dc2626' }}>
                        <span>Saturday surcharge (+{pricePreview.weekendSurchargePercent}%):</span>
                        <span>Applied</span>
                      </div>
                    )}
                    {pricePreview.advanceDiscountApplied && (
                      <div className="flex flex-between" style={{ marginBottom: '0.25rem', color: '#16a34a' }}>
                        <span>Early bird ({pricePreview.daysBookedInAdvance}d, -{pricePreview.advanceDiscountPercent}%):</span>
                        <span>Applied</span>
                      </div>
                    )}
                    <div className="flex flex-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
                      <span>Total ({pricePreview.numberOfDays} day{pricePreview.numberOfDays > 1 ? 's' : ''}):</span>
                      <span>₹{pricePreview.totalPrice}</span>
                    </div>
                  </div>
                )}

                {/* Blocked date warning */}
                {bookingForm.startDate && bookingForm.endDate && checkBlockedOverlap(bookingForm.startDate, bookingForm.endDate) && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#b91c1c' }}>
                    ⚠️ Your dates overlap with an existing booking. Pick different dates.
                  </div>
                )}

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
