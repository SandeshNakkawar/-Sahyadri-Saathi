import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './Dashboard.css';

export default function GuideDashboard() {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('requests');

  // Payout request modal/form state
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [upiAccountName, setUpiAccountName] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  // Pricing form state
  const [pricingForm, setPricingForm] = useState(null);
  const [pricingSaving, setPricingSaving] = useState(false);

  useEffect(() => {
    fetchGuideData();
  }, []);

  const fetchGuideData = async () => {
    setLoading(true);
    try {
      // 1. Get guide profile
      const profileRes = await api.get('/guide-profiles/me');
      setProfile(profileRes.data.data.profile);

      // 2. Get guide bookings
      const bookingsRes = await api.get('/guide-bookings/guide-requests');
      setBookings(bookingsRes.data.data.bookings || []);

      // 3. Get payouts
      const payoutsRes = await api.get('/payout-requests/my-payouts');
      setPayouts(payoutsRes.data.data.payouts || payoutsRes.data.data.requests || []);
    } catch (err) {
      if (err.response?.status === 404) {
        // No profile created yet
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await api.patch(`/guide-bookings/${id}/accept`);
      alert('Booking accepted!');
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'accepted' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept booking');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      await api.patch(`/guide-bookings/${id}/reject`);
      alert('Booking rejected.');
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'rejected' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject booking');
    }
  };

  const handleStartTrip = async (id) => {
    try {
      await api.patch(`/guide-bookings/${id}/start-trip`);
      alert('Trip marked as in-progress!');
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'in_progress' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start trip');
    }
  };

  const handleMarkComplete = async (id) => {
    try {
      await api.patch(`/guide-bookings/${id}/guide-mark-complete`);
      alert('Trip marked as completed from your side!');
      // Update state local check
      setBookings(prev => prev.map(b => {
        if (b._id === id) {
          const comp = b.completion || {};
          const nextComp = { ...comp, guideMarkedCompleted: true };
          const bothDone = nextComp.touristConfirmedCompleted && nextComp.guideMarkedCompleted;
          return {
            ...b,
            status: bothDone ? 'completed' : b.status,
            payoutStatus: bothDone ? 'request_allowed' : b.payoutStatus,
            completion: nextComp
          };
        }
        return b;
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark trip complete');
    }
  };

  const openPayoutRequest = (booking) => {
    setSelectedBooking(booking);
    setUpiId('');
    setUpiAccountName('');
    setShowPayoutForm(true);
  };

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    if (!upiId || !upiAccountName) return alert('Please enter UPI ID and Account Name');
    setPayoutSubmitting(true);
    try {
      await api.post(`/payout-requests/${selectedBooking._id}`, {
        upiId,
        upiAccountName
      });
      alert('Payout requested successfully! Admin will process it.');
      setShowPayoutForm(false);
      
      // Refresh data
      fetchGuideData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request payout');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  // ─── Pricing Helpers ───────────────────────────────────────────
  const initPricingForm = (p) => {
    setPricingForm({
      pricePerDay: p.pricePerDay || 0,
      halfDayPrice: p.halfDayPrice || 0,
      weekendSurchargePercent: p.weekendSurchargePercent || 0,
      advanceBookingDiscount: {
        daysInAdvance: p.advanceBookingDiscount?.daysInAdvance || 0,
        discountPercent: p.advanceBookingDiscount?.discountPercent || 0
      },
      pricingRules: p.pricingRules?.length
        ? p.pricingRules.map(r => ({ ...r }))
        : []
    });
  };

  const addPricingRule = () => {
    setPricingForm(prev => ({
      ...prev,
      pricingRules: [...prev.pricingRules, { name: '', startMonth: 1, endMonth: 3, multiplier: 1 }]
    }));
  };

  const removePricingRule = (idx) => {
    setPricingForm(prev => ({
      ...prev,
      pricingRules: prev.pricingRules.filter((_, i) => i !== idx)
    }));
  };

  const updatePricingRule = (idx, field, value) => {
    setPricingForm(prev => {
      const rules = [...prev.pricingRules];
      rules[idx] = { ...rules[idx], [field]: value };
      return { ...prev, pricingRules: rules };
    });
  };

  const handlePricingSave = async () => {
    if (!pricingForm.pricePerDay || pricingForm.pricePerDay <= 0) {
      return alert('Daily price must be greater than 0.');
    }
    setPricingSaving(true);
    try {
      const res = await api.patch('/guide-profiles/me', pricingForm);
      setProfile(res.data.data.profile);
      alert('Pricing updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update pricing');
    } finally {
      setPricingSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p>Loading your guide workspace...</p>
      </div>
    );
  }

  // If no guide profile exists yet, show Onboarding prompt
  if (!profile) {
    return (
      <div className="dashboard-page container section text-center" style={{ maxWidth: '600px' }}>
        <span style={{ fontSize: '4rem' }}>🧭</span>
        <h1 style={{ marginTop: '1rem', marginBottom: '1rem' }}>Become a Local Guide</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          Onboard yourself as a verified local guide for Sahyadri Saathi. Share your knowledge of Maharashtra forts, heritage sites, and guide trekkers safely while earning competitive rates.
        </p>
        <Link to="/guide-onboarding" className="btn btn-accent btn-lg">Start Guide Onboarding</Link>
      </div>
    );
  }

  // Filter bookings based on active tab
  const getFilteredBookings = () => {
    if (tab === 'requests') {
      return bookings.filter(b => b.status === 'pending');
    }
    if (tab === 'active') {
      return bookings.filter(b => ['accepted', 'confirmed', 'in_progress'].includes(b.status));
    }
    if (tab === 'past') {
      return bookings.filter(b => ['completed', 'rejected', 'cancelled'].includes(b.status));
    }
    return [];
  };

  const filteredBookings = getFilteredBookings();

  return (
    <div className="dashboard-page container section">
      {/* Verification Status Banner */}
      {profile.verificationStatus !== 'approved' && (
        <div className={`verification-banner ${profile.verificationStatus}`}>
          {profile.verificationStatus === 'pending_review' && (
            <>
              <span>⏳</span>
              <div>
                <strong>Verification Pending:</strong> Your guide profile is currently under review by our admin team. Once approved, travelers will see you listed.
              </div>
            </>
          )}
          {profile.verificationStatus === 'rejected' && (
            <>
              <span>⚠️</span>
              <div>
                <strong>Profile Rejected:</strong> {profile.rejectionReason || 'Please review your verification details.'} 
                <br />
                <Link to="/guide-onboarding" className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem', display: 'inline-block' }}>Edit Profile</Link>
              </div>
            </>
          )}
          {profile.verificationStatus === 'draft' && (
            <>
              <span>📝</span>
              <div>
                <strong>Draft Profile:</strong> You haven't submitted your profile for verification yet. Click below to edit and submit.
                <br />
                <Link to="/guide-onboarding" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem', display: 'inline-block' }}>Complete Onboarding</Link>
              </div>
            </>
          )}
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h1>Guide Workspace</h1>
          <p className="text-muted">Welcome, {profile.displayName || 'Guide'}</p>
        </div>
        <div className="flex gap-sm">
          <Link to="/guide-onboarding" className="btn btn-outline btn-sm">⚙️ Edit Profile</Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">₹</div>
          <div className="stat-info">
            <span className="stat-value">₹{profile.totalEarnings || 0}</span>
            <span className="stat-label">Total Earnings</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🥾</div>
          <div className="stat-info">
            <span className="stat-value">{bookings.filter(b => b.status === 'completed').length}</span>
            <span className="stat-label">Completed Trips</span>
          </div>
        </div>
        <div className="stat-card accent">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <span className="stat-value">{profile.ratingsAverage ? profile.ratingsAverage.toFixed(1) : 'N/A'}</span>
            <span className="stat-label">{profile.ratingsQuantity || 0} Reviews</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">₹{profile.pricePerDay}</span>
            <span className="stat-label">Daily Price</span>
          </div>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="dash-tabs">
        <button className={`dash-tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
          🔔 Booking Requests ({bookings.filter(b => b.status === 'pending').length})
        </button>
        <button className={`dash-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          🥾 Active / Confirmed Trips ({bookings.filter(b => ['accepted', 'confirmed', 'in_progress'].includes(b.status)).length})
        </button>
        <button className={`dash-tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
          🎒 Past Trips ({bookings.filter(b => ['completed', 'rejected', 'cancelled'].includes(b.status)).length})
        </button>
        <button className={`dash-tab ${tab === 'payouts' ? 'active' : ''}`} onClick={() => setTab('payouts')}>
          💳 Payouts & UPI ({payouts.length})
        </button>
        <button className={`dash-tab ${tab === 'pricing' ? 'active' : ''}`} onClick={() => { setTab('pricing'); if (!pricingForm) initPricingForm(profile); }}>
          💰 Pricing
        </button>
      </div>

      {/* Pricing Tab Content */}
      {tab === 'pricing' && pricingForm ? (
        <div className="pricing-section animate-fade-in">
          <div className="dashboard-grid">
            <div>
              <h3>Update Your Pricing</h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Set your daily rate, seasonal rules, and discounts. Changes take effect for new bookings immediately.</p>

              <div className="grid grid-2" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                <div className="form-group">
                  <label className="form-label">💰 Price Per Day (₹) *</label>
                  <input type="number" min={100} className="form-input" value={pricingForm.pricePerDay} onChange={e => setPricingForm(prev => ({ ...prev, pricePerDay: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">🌗 Half-Day Price (₹)</label>
                  <input type="number" min={0} className="form-input" value={pricingForm.halfDayPrice} onChange={e => setPricingForm(prev => ({ ...prev, halfDayPrice: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
                <label className="form-label">📅 Weekend Surcharge: <strong>{pricingForm.weekendSurchargePercent}%</strong></label>
                <input type="range" min={0} max={50} step={1} value={pricingForm.weekendSurchargePercent} onChange={e => setPricingForm(prev => ({ ...prev, weekendSurchargePercent: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--color-accent)' }} />
                <div className="flex flex-between text-sm text-muted"><span>0%</span><span>50%</span></div>
              </div>

              <div style={{ padding: 'var(--space-lg)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)' }}>
                <label className="form-label" style={{ marginBottom: 'var(--space-md)' }}>🎟️ Advance Booking Discount</label>
                <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="form-label text-sm">Days in Advance (min)</label>
                    <input type="number" min={0} className="form-input" value={pricingForm.advanceBookingDiscount.daysInAdvance} onChange={e => setPricingForm(prev => ({ ...prev, advanceBookingDiscount: { ...prev.advanceBookingDiscount, daysInAdvance: parseInt(e.target.value) || 0 } }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-sm">Discount %</label>
                    <input type="number" min={0} max={50} className="form-input" value={pricingForm.advanceBookingDiscount.discountPercent} onChange={e => setPricingForm(prev => ({ ...prev, advanceBookingDiscount: { ...prev.advanceBookingDiscount, discountPercent: parseInt(e.target.value) || 0 } }))} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="flex flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                  <label className="form-label">📊 Seasonal Pricing Rules</label>
                  <button type="button" onClick={addPricingRule} className="btn btn-outline btn-sm">➕ Add Season</button>
                </div>

                {pricingForm.pricingRules.length === 0 ? (
                  <p className="text-muted text-sm">No seasonal rules. Base price applies all year.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {pricingForm.pricingRules.map((rule, idx) => (
                      <div key={idx} style={{ padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <div className="grid grid-2" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                          <div className="form-group">
                            <label className="form-label text-sm">Season Name</label>
                            <input type="text" className="form-input" placeholder="e.g. Monsoon Peak" value={rule.name} onChange={e => updatePricingRule(idx, 'name', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label text-sm">Multiplier (0.5x–3x)</label>
                            <input type="number" className="form-input" min={0.5} max={3} step={0.1} value={rule.multiplier} onChange={e => updatePricingRule(idx, 'multiplier', parseFloat(e.target.value) || 1)} />
                          </div>
                        </div>
                        <div className="grid grid-2" style={{ gap: 'var(--space-sm)' }}>
                          <div className="form-group">
                            <label className="form-label text-sm">Start Month</label>
                            <select className="form-select" value={rule.startMonth} onChange={e => updatePricingRule(idx, 'startMonth', parseInt(e.target.value))}>
                              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label text-sm">End Month</label>
                            <select className="form-select" value={rule.endMonth} onChange={e => updatePricingRule(idx, 'endMonth', parseInt(e.target.value))}>
                              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: 'var(--space-sm)' }}>
                          <button type="button" onClick={() => removePricingRule(idx)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}>🗑️ Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
                <button onClick={() => initPricingForm(profile)} className="btn btn-ghost btn-sm" disabled={pricingSaving}>Reset</button>
                <button onClick={handlePricingSave} className="btn btn-accent" disabled={pricingSaving}>
                  {pricingSaving ? 'Saving...' : '💾 Save Pricing'}
                </button>
              </div>
            </div>

            <div className="dashboard-sidebar-card">
              <h3>Pricing Tips</h3>
              <p className="text-sm text-muted">Your base daily rate is the starting point. Seasonal rules multiply it for peak/off-peak months.</p>
              <div className="text-sm">
                <strong>Example:</strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                  <li>Base: ₹1500/day</li>
                  <li>Monsoon (Jun–Sep) at 1.5x = ₹2250</li>
                  <li>Weekday bookings stay at base</li>
                  <li>Weekend bookings get surcharge %</li>
                </ul>
              </div>
              <p className="text-sm text-muted">Advance discount rewards tourists who plan ahead — great for filling your calendar early.</p>
            </div>
          </div>
        </div>
      ) : tab === 'payouts' ? (
        <div className="payouts-section">
          <div className="dashboard-grid">
            <div>
              <h3>Eligible Bookings for Payout</h3>
              <p className="text-muted" style={{ marginBottom: '1rem' }}>Trips completed and verified by the tourist.</p>
              
              {bookings.filter(b => b.payoutStatus === 'request_allowed').length === 0 ? (
                <p className="text-muted" style={{ padding: '1rem 0' }}>No bookings eligible for payout at the moment.</p>
              ) : (
                <div className="bookings-list">
                  {bookings.filter(b => b.payoutStatus === 'request_allowed').map(b => (
                    <div className="booking-item card" key={b._id}>
                      <div className="booking-item-header">
                        <div>
                          <h4>{b.place?.name}</h4>
                          <p className="text-muted text-sm">Tourist: {b.tourist?.name} | Date: {new Date(b.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="badge badge-verified">Ready to Request</span>
                        </div>
                      </div>
                      <div className="booking-item-details">
                        <div><strong>Total Price Collected:</strong> ₹{b.totalPrice}</div>
                        <div><strong>Platform Commission:</strong> ₹{b.platformCommissionAmount} ({(b.platformCommissionRate * 100).toFixed(0)}%)</div>
                        <div><strong>Your Payout Amount:</strong> ₹{b.guidePayoutAmount}</div>
                      </div>
                      <div className="booking-item-actions">
                        <button onClick={() => openPayoutRequest(b)} className="btn btn-accent btn-sm">💳 Request Payout via UPI</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ marginTop: '2rem' }}>Payout Request History</h3>
              {payouts.length === 0 ? (
                <p className="text-muted" style={{ padding: '1rem 0' }}>No payout request history.</p>
              ) : (
                <div className="bookings-list" style={{ marginTop: '1rem' }}>
                  {payouts.map(p => (
                    <div className="booking-item card" key={p._id}>
                      <div className="booking-item-header">
                        <div>
                          <h4>Payout ID: ...{p._id.slice(-6)}</h4>
                          <p className="text-muted text-sm">Requested: {new Date(p.requestedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                          <span className={`status-dot status-${p.status}`}></span>
                          <span className="text-sm" style={{ textTransform: 'capitalize' }}>{p.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="booking-item-details">
                        <div><strong>Amount Requested:</strong> ₹{p.amount}</div>
                        <div><strong>UPI Masked:</strong> {p.upiMasked || 'N/A'}</div>
                        <div><strong>Account Holder:</strong> {p.upiAccountName}</div>
                        {p.adminTransactionRef && (
                          <div><strong>Ref/Txn No:</strong> {p.adminTransactionRef}</div>
                        )}
                      </div>
                      {p.adminNote && (
                        <div style={{ fontStyle: 'italic', padding: '0.5rem', background: 'var(--color-stone)', borderRadius: 'var(--radius-sm)' }}>
                          <strong>Admin Note:</strong> {p.adminNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout Information Sidebar */}
            <div className="dashboard-sidebar-card">
              <h3>Payout Policy</h3>
              <p className="text-sm text-muted">
                Sahyadri Saathi collects 100% of traveler payments at booking. After you complete the trip and the tourist confirms, your funds become available to claim.
              </p>
              <div className="text-sm">
                <strong>Commission Split:</strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                  <li>Guide Payout: 85%</li>
                  <li>Platform Fee: 15%</li>
                </ul>
              </div>
              <p className="text-sm text-muted">
                UPI payouts are manually processed by admins within 24-48 business hours after request. We clear temporary UPI records from our system once paid to safeguard your privacy.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Bookings Tabs Content */
        <div className="bookings-section">
          {filteredBookings.length === 0 ? (
            <p className="text-muted" style={{ padding: '2rem 0' }}>No bookings in this tab.</p>
          ) : (
            <div className="bookings-list">
              {filteredBookings.map(booking => (
                <div className="booking-item card" key={booking._id}>
                  <div className="booking-item-header">
                    <div>
                      <h4>{booking.place?.name || 'Place'}</h4>
                      <p className="text-muted text-sm">Tourist: {booking.tourist?.name || 'Traveler'} ({booking.tourist?.email || 'N/A'})</p>
                    </div>
                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                      <span className={`status-dot status-${booking.status}`}></span>
                      <span className="text-sm" style={{ textTransform: 'capitalize' }}>{booking.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="booking-item-details">
                    <div><strong>Dates:</strong> {new Date(booking.startDate).toLocaleDateString()} — {new Date(booking.endDate).toLocaleDateString()} ({booking.numberOfDays} {booking.numberOfDays === 1 ? 'day' : 'days'})</div>
                    <div><strong>Travelers:</strong> {booking.numberOfTravelers}</div>
                    <div><strong>Earnings (85%):</strong> ₹{booking.guidePayoutAmount}</div>
                    <div><strong>Payment Status:</strong> <span className={`status-dot status-${booking.paymentStatus}`}></span>{booking.paymentStatus}</div>
                    {booking.meetingPoint && (
                      <div className="grid-colspan-all"><strong>Meeting Point:</strong> {booking.meetingPoint}</div>
                    )}
                    {booking.specialRequests && (
                      <div className="grid-colspan-all" style={{ fontStyle: 'italic' }}><strong>Special Requests:</strong> "{booking.specialRequests}"</div>
                    )}
                  </div>
                  <div className="booking-item-actions">
                    {/* Booking Details Link */}
                    <Link to={`/booking/${booking._id}`} className="btn btn-outline btn-sm">
                      🔍 Booking Details
                    </Link>

                    {/* Coordination Chat — available once booking is accepted */}
                    {['accepted', 'confirmed', 'in_progress', 'completed'].includes(booking.status) && (
                      <Link to={`/chat/${booking._id}`} className="btn btn-primary btn-sm">
                        💬 Open Chat
                      </Link>
                    )}

                    {/* Pending actions */}
                    {booking.status === 'pending' && (
                      <>
                        <button onClick={() => handleReject(booking._id)} className="btn btn-outline btn-sm">❌ Reject</button>
                        <button onClick={() => handleAccept(booking._id)} className="btn btn-accent btn-sm">✅ Accept Request</button>
                      </>
                    )}

                    {/* Confirmed actions */}
                    {booking.status === 'confirmed' && (
                      <button onClick={() => handleStartTrip(booking._id)} className="btn btn-primary btn-sm">🥾 Start Trip</button>
                    )}

                    {/* In Progress actions */}
                    {booking.status === 'in_progress' && !booking.completion?.guideMarkedCompleted && (
                      <button onClick={() => handleMarkComplete(booking._id)} className="btn btn-accent btn-sm">🏁 Mark Complete</button>
                    )}

                    {/* Waiting on other party */}
                    {booking.completion?.guideMarkedCompleted && !booking.completion?.touristConfirmedCompleted && (
                      <span className="badge badge-pending">⏳ Waiting for Tourist Confirmation</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payout Request Modal / Form */}
      {showPayoutForm && selectedBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card-glass" style={{
            background: 'var(--color-surface)', padding: '2rem',
            borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '90%'
          }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Request UPI Payout</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
              For booking at {selectedBooking.place?.name}. You will receive <strong>₹{selectedBooking.guidePayoutAmount}</strong> (15% platform fee deducted).
            </p>

            <form onSubmit={handlePayoutSubmit}>
              <div className="form-group">
                <label className="form-label">UPI ID (VPA)</label>
                <input
                  type="text"
                  placeholder="e.g. rajesh@okaxis, 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Holder Name (matching Bank/UPI)</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Pandurang Patil"
                  value={upiAccountName}
                  onChange={(e) => setUpiAccountName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div style={{
                fontSize: '0.75rem', color: 'var(--color-danger)', 
                background: 'rgba(192, 57, 43, 0.05)', padding: '0.5rem', 
                borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem'
              }}>
                🔒 Your exact UPI ID is temporarily stored and cleared immediately after processing payment to ensure maximum privacy.
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowPayoutForm(false)} className="btn btn-ghost btn-sm" disabled={payoutSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-accent btn-sm" disabled={payoutSubmitting}>
                  {payoutSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
