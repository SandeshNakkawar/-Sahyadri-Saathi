import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './Dashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingGuides, setPendingGuides] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  // Review Guide Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Payout processing modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [txnRef, setTxnRef] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  // Place CRUD Modal State
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [placeCategory, setPlaceCategory] = useState('fort');
  const [placeCity, setPlaceCity] = useState('');
  const [placeDistrict, setPlaceDistrict] = useState('');
  const [placeState, setPlaceState] = useState('Maharashtra');
  const [placeDifficulty, setPlaceDifficulty] = useState('moderate');
  const [placeDuration, setPlaceDuration] = useState('4-6 hours');
  const [placeFee, setPlaceFee] = useState(0);
  const [placeDesc, setPlaceDesc] = useState('');
  const [placeImage, setPlaceImage] = useState(null);
  const [placeSubmitting, setPlaceSubmitting] = useState(false);

  // Revenue chart state
  const [revenueData, setRevenueData] = useState(null);
  const [revenueYear, setRevenueYear] = useState(new Date().getFullYear());

  // Users tab state
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Reviews tab state
  const [reviews, setReviews] = useState([]);

  // Guide filter for verifications tab
  const [guideStatusFilter, setGuideStatusFilter] = useState('pending_review');

  useEffect(() => {
    fetchAdminData();
  }, [tab, guideStatusFilter, userRoleFilter, revenueYear]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const statsRes = await api.get('/admin/dashboard');
        setStats(statsRes.data.data);
      } else if (tab === 'verifications') {
        const guidesRes = await api.get(`/guide-profiles/admin/all${guideStatusFilter ? `?status=${guideStatusFilter}` : ''}`);
        setPendingGuides(guidesRes.data.data.guides || []);
      } else if (tab === 'payouts') {
        const payoutsRes = await api.get('/admin/payouts');
        setPayouts(payoutsRes.data.data.payouts || []);
      } else if (tab === 'bookings') {
        const bookingsRes = await api.get('/admin/bookings');
        setBookings(bookingsRes.data.data.bookings || []);
      } else if (tab === 'places') {
        const placesRes = await api.get('/places?limit=100');
        setPlaces(placesRes.data.data.data || []);
      } else if (tab === 'revenue') {
        const revRes = await api.get(`/admin/revenue?year=${revenueYear}`);
        setRevenueData(revRes.data.data);
      } else if (tab === 'users') {
        const usersRes = await api.get(`/admin/users${userRoleFilter ? `?role=${userRoleFilter}` : ''}`);
        setUsers(usersRes.data.data.users || []);
      } else if (tab === 'reviews') {
        const reviewsRes = await api.get('/admin/reviews');
        setReviews(reviewsRes.data.data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Guide Verification Handlers ────────────────────────────────
  const handleApproveGuide = async (id) => {
    if (!window.confirm('Are you sure you want to approve this guide?')) return;
    try {
      await api.patch(`/guide-profiles/admin/${id}/approve`);
      alert('Guide approved successfully! They are now live on the platform.');
      setPendingGuides(prev => prev.filter(g => g._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve guide');
    }
  };

  const openRejectModal = (id) => {
    setSelectedGuideId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectGuideSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return alert('Please enter a rejection reason.');
    setRejectSubmitting(true);
    try {
      await api.patch(`/guide-profiles/admin/${selectedGuideId}/reject`, {
        reason: rejectionReason
      });
      alert('Guide application rejected.');
      setShowRejectModal(false);
      setPendingGuides(prev => prev.filter(g => g._id !== selectedGuideId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject guide');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // ─── Payout Processing Handlers ─────────────────────────────────
  const openPayoutModal = (payout) => {
    setSelectedPayout(payout);
    setTxnRef('');
    setAdminNote('');
    setShowPayoutModal(true);
  };

  const handleMarkPaidSubmit = async (e) => {
    e.preventDefault();
    if (!txnRef.trim()) return alert('Please enter UPI Transaction Reference No.');
    setPayoutSubmitting(true);
    try {
      await api.patch(`/payout-requests/${selectedPayout._id}/mark-paid`, {
        transactionRef: txnRef,
        adminNote
      });
      alert('Payout marked as PAID. Guide total earnings updated.');
      setShowPayoutModal(false);
      setPayouts(prev => prev.map(p => p._id === selectedPayout._id ? { ...p, status: 'paid', adminTransactionRef: txnRef, adminNote } : p));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark payout as paid');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleHoldPayout = async (payoutId) => {
    const note = window.prompt('Enter reason for placing this payout on hold:');
    if (note === null) return;
    try {
      await api.patch(`/payout-requests/${payoutId}/hold`, { adminNote: note || 'On hold by admin' });
      alert('Payout request status set to ON HOLD.');
      setPayouts(prev => prev.map(p => p._id === payoutId ? { ...p, status: 'on_hold', adminNote: note || 'On hold by admin' } : p));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to put payout on hold');
    }
  };

  const handleRejectPayout = async (payoutId) => {
    const note = window.prompt('Enter reason for rejecting this payout request:');
    if (note === null) return;
    if (!note.trim()) return alert('A reason is required to reject a payout.');
    try {
      await api.patch(`/payout-requests/${payoutId}/reject`, { adminNote: note });
      alert('Payout request REJECTED.');
      setPayouts(prev => prev.map(p => p._id === payoutId ? { ...p, status: 'rejected', adminNote: note } : p));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject payout');
    }
  };

  // ─── Guide Suspend / Reinstate Handlers ───────────────────
  const handleSuspendGuide = async (id) => {
    if (!window.confirm('Suspend this guide? They will be hidden from public listings.')) return;
    try {
      await api.patch(`/guide-profiles/admin/${id}/suspend`);
      alert('Guide suspended.');
      setPendingGuides(prev => prev.map(g => g._id === id ? { ...g, verificationStatus: 'suspended', isPublic: false } : g));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to suspend guide');
    }
  };

  const handleReinstateGuide = async (id) => {
    if (!window.confirm('Reinstate this guide? They will be approved and visible again.')) return;
    try {
      await api.patch(`/guide-profiles/admin/${id}/approve`);
      alert('Guide reinstated and approved.');
      setPendingGuides(prev => prev.map(g => g._id === id ? { ...g, verificationStatus: 'approved', isPublic: true } : g));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reinstate guide');
    }
  };

  // ─── Delete Review Handler ──────────────────────────────
  const handleDeleteReview = async (id) => {
    if (!window.confirm('Permanently delete this review? This cannot be undone.')) return;
    try {
      await api.delete(`/reviews/${id}`);
      alert('Review deleted.');
      setReviews(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete review');
    }
  };

  // Helper to open private files in a new tab securely as Blobs (prevents token leakage in URL)
  const viewDoc = async (guideId, docType) => {
    try {
      const res = await api.get(`/guide-profiles/${guideId}/documents/${docType}`, {
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      window.open(blobUrl, '_blank');
    } catch (err) {
      alert('Failed to load private document. You may be unauthorized or the file is missing.');
    }
  };

  // ─── Place CRUD Handlers ────────────────────────────────────────
  const openAddPlaceModal = () => {
    setEditingPlace(null);
    setPlaceName('');
    setPlaceCategory('fort');
    setPlaceCity('');
    setPlaceDistrict('');
    setPlaceState('Maharashtra');
    setPlaceDifficulty('moderate');
    setPlaceDuration('4-6 hours');
    setPlaceFee(0);
    setPlaceDesc('');
    setPlaceImage(null);
    setShowPlaceModal(true);
  };

  const openEditPlaceModal = (place) => {
    setEditingPlace(place);
    setPlaceName(place.name || '');
    setPlaceCategory(place.category || 'fort');
    setPlaceCity(place.city || '');
    setPlaceDistrict(place.district || '');
    setPlaceState(place.state || 'Maharashtra');
    setPlaceDifficulty(place.difficultyLevel || 'moderate');
    setPlaceDuration(place.estimatedDuration || '4-6 hours');
    setPlaceFee(place.entryFee || 0);
    setPlaceDesc(place.description || '');
    setPlaceImage(null); // Keep existing unless replaced
    setShowPlaceModal(true);
  };

  const handlePlaceSubmit = async (e) => {
    e.preventDefault();
    if (!placeName.trim() || !placeCity.trim()) return alert('Name and City are required.');
    
    setPlaceSubmitting(true);
    const formData = new FormData();
    formData.append('name', placeName);
    formData.append('category', placeCategory);
    formData.append('city', placeCity);
    formData.append('district', placeDistrict);
    formData.append('state', placeState);
    formData.append('difficultyLevel', placeDifficulty);
    formData.append('estimatedDuration', placeDuration);
    formData.append('entryFee', placeFee);
    formData.append('description', placeDesc);
    if (placeImage) {
      formData.append('imageCover', placeImage);
    }

    try {
      if (editingPlace) {
        // Edit existing place
        const res = await api.patch(`/places/${editingPlace._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Place updated successfully!');
        setPlaces(prev => prev.map(p => p._id === editingPlace._id ? res.data.data.data : p));
      } else {
        // Add new place
        const res = await api.post('/places', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('New place added successfully!');
        setPlaces(prev => [res.data.data.data, ...prev]);
      }
      setShowPlaceModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save place');
    } finally {
      setPlaceSubmitting(false);
    }
  };

  const handleDeletePlace = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this place? Guides registered here will lose this location.')) return;
    try {
      await api.delete(`/places/${id}`);
      alert('Place deleted.');
      setPlaces(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete place');
    }
  };

  return (
    <div className="dashboard-page container section">
      <div className="dashboard-header">
        <div>
          <h1>Admin Control Panel</h1>
          <p className="text-muted">Monitor and oversee the Sahyadri Saathi guide marketplace</p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="dash-tabs">
        <button className={`dash-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          📊 Overview
        </button>
        <button className={`dash-tab ${tab === 'verifications' ? 'active' : ''}`} onClick={() => setTab('verifications')}>
          🔍 Guides ({stats?.pendingVerifications || pendingGuides.length || 0})
        </button>
        <button className={`dash-tab ${tab === 'payouts' ? 'active' : ''}`} onClick={() => setTab('payouts')}>
          💳 Payouts ({stats?.pendingPayouts || payouts.filter(p => p.status === 'requested').length || 0})
        </button>
        <button className={`dash-tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>
          🥾 All Bookings
        </button>
        <button className={`dash-tab ${tab === 'revenue' ? 'active' : ''}`} onClick={() => setTab('revenue')}>
          📈 Revenue
        </button>
        <button className={`dash-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          👥 Users
        </button>
        <button className={`dash-tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>
          ⭐ Reviews
        </button>
        <button className={`dash-tab ${tab === 'places' ? 'active' : ''}`} onClick={() => setTab('places')}>
          🏰 Places
        </button>
      </div>

      {loading ? (
        <div className="loading-page">
          <div className="spinner"></div>
          <p>Loading dashboard workspace...</p>
        </div>
      ) : (
        <>
          {/* Tab Content: OVERVIEW */}
          {tab === 'overview' && stats && (
            <div className="overview-tab animate-fade-in">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <span className="stat-value">₹{stats.totalRevenue}</span>
                    <span className="stat-label">Total Booking Revenue</span>
                  </div>
                </div>
                <div className="stat-card accent">
                  <div className="stat-icon">📈</div>
                  <div className="stat-info">
                    <span className="stat-value">₹{stats.totalPlatformEarnings}</span>
                    <span className="stat-label">Platform Fees (15%)</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🥾</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalBookings}</span>
                    <span className="stat-label">Total Trips Booked</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🧭</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalGuides}</span>
                    <span className="stat-label">Verified Guides</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
                <div className="card" style={{ padding: '2rem' }}>
                  <h3>System Status & Alerts</h3>
                  <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Attention required items</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="flex flex-between" style={{ padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-accent)' }}>
                      <div>
                        <strong>Pending Guide Onboardings</strong>
                        <p className="text-sm text-muted">Verification documents require manual validation</p>
                      </div>
                      <button onClick={() => setTab('verifications')} className="btn btn-accent btn-sm">
                        Review {stats.pendingVerifications} guides
                      </button>
                    </div>

                    <div className="flex flex-between" style={{ padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-primary)' }}>
                      <div>
                        <strong>Requested Guide Payouts</strong>
                        <p className="text-sm text-muted">Guide payouts that need bank transfer & confirmation</p>
                      </div>
                      <button onClick={() => setTab('payouts')} className="btn btn-primary btn-sm">
                        Process {stats.pendingPayouts} payouts
                      </button>
                    </div>
                  </div>
                </div>

                <div className="dashboard-sidebar-card">
                  <h3>Quick Numbers</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className="flex flex-between">
                      <span className="text-muted">Total Registered Users</span>
                      <strong>{stats.totalUsers}</strong>
                    </div>
                    <div className="flex flex-between">
                      <span className="text-muted">Total Monitored Places</span>
                      <strong>{stats.totalPlaces}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: VERIFICATIONS (All Guides with Filter) */}
          {tab === 'verifications' && (
            <div className="verifications-tab animate-fade-in">
              <div className="flex flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div>
                  <h3>Guide Management</h3>
                  <p className="text-muted">Filter by status, verify documents, suspend or reinstate guides.</p>
                </div>
                <select className="form-select" style={{ width: 'auto', minWidth: '180px' }} value={guideStatusFilter} onChange={e => setGuideStatusFilter(e.target.value)}>
                  <option value="pending_review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                  <option value="">All Statuses</option>
                </select>
              </div>
              
              {pendingGuides.length === 0 ? (
                <p className="text-muted" style={{ padding: '2rem 0' }}>No guides found with this status.</p>
              ) : (
                <div className="bookings-list">
                  {pendingGuides.map(guide => (
                    <div className="booking-item card" key={guide._id}>
                      <div className="booking-item-header">
                        <div>
                          <h4>{guide.displayName}</h4>
                          <p className="text-muted text-sm">Email: {guide.user?.email || 'N/A'} | Phone: {guide.user?.phone || 'N/A'}</p>
                        </div>
                        <span className={`badge badge-${guide.verificationStatus === 'approved' ? 'verified' : guide.verificationStatus === 'suspended' ? 'danger' : 'pending'}`} style={{ textTransform: 'capitalize' }}>
                          {guide.verificationStatus.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="booking-item-details">
                        <div><strong>Base City:</strong> {guide.baseCity}</div>
                        <div><strong>Experience:</strong> {guide.experienceYears} Years</div>
                        <div><strong>Daily Rate:</strong> ₹{guide.pricePerDay}</div>
                        <div><strong>Languages:</strong> {guide.languages?.join(', ')}</div>
                        <div className="grid-colspan-all"><strong>Bio:</strong> "{guide.bio}"</div>
                      </div>

                      {guide.verificationStatus === 'pending_review' && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                          <strong>Verification Documents (Stored Privately):</strong>
                          <div className="flex gap-md" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            <button onClick={() => viewDoc(guide._id, 'idProof')} className="btn btn-outline btn-sm">🪪 View ID Proof</button>
                            <button onClick={() => viewDoc(guide._id, 'addressProof')} className="btn btn-outline btn-sm">🏠 View Address Proof</button>
                            {guide.documents?.certificate && (
                              <button onClick={() => viewDoc(guide._id, 'certificate')} className="btn btn-outline btn-sm">📜 View Trekking Certificate</button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="booking-item-actions" style={{ marginTop: '1.5rem' }}>
                        {guide.verificationStatus === 'pending_review' && (
                          <>
                            <button onClick={() => openRejectModal(guide._id)} className="btn btn-outline btn-sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>❌ Reject</button>
                            <button onClick={() => handleApproveGuide(guide._id)} className="btn btn-primary btn-sm">✅ Approve</button>
                          </>
                        )}
                        {guide.verificationStatus === 'approved' && (
                          <button onClick={() => handleSuspendGuide(guide._id)} className="btn btn-outline btn-sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>⛔ Suspend Guide</button>
                        )}
                        {guide.verificationStatus === 'suspended' && (
                          <button onClick={() => handleReinstateGuide(guide._id)} className="btn btn-primary btn-sm">🔄 Reinstate Guide</button>
                        )}
                        {guide.verificationStatus === 'rejected' && (
                          <button onClick={() => handleApproveGuide(guide._id)} className="btn btn-primary btn-sm">✅ Approve</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: PAYOUTS */}
          {tab === 'payouts' && (
            <div className="payouts-tab animate-fade-in">
              <h3>Guide UPI Payout Requests</h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Manually transfer funds to the guide's UPI ID, then record reference numbers to confirm.</p>
              
              {payouts.length === 0 ? (
                <p className="text-muted" style={{ padding: '2rem 0' }}>No payout requests found.</p>
              ) : (
                <div className="bookings-list">
                  {payouts.map(p => (
                    <div className="booking-item card" key={p._id}>
                      <div className="booking-item-header">
                        <div>
                          <h4>Request ID: ...{p._id.slice(-6)}</h4>
                          <p className="text-muted text-sm">Requested: {new Date(p.requestedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                          <span className={`status-dot status-${p.status}`}></span>
                          <span className="text-sm" style={{ textTransform: 'capitalize' }}>{p.status.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div className="booking-item-details">
                        <div><strong>Guide Name:</strong> {p.guideProfile?.displayName || 'Guide'}</div>
                        <div><strong>Amount Due:</strong> <strong className="text-accent" style={{ fontSize: '1.2rem' }}>₹{p.amount}</strong></div>
                        <div><strong>Commission Collected:</strong> ₹{p.platformCommissionAmount}</div>
                        <div><strong>UPI ID:</strong> <code style={{ fontSize: '1.05rem', color: 'var(--color-primary-light)', background: 'var(--color-stone)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>{p.temporaryUpiId || p.upiMasked || 'N/A'}</code></div>
                        <div><strong>Account Holder Name:</strong> {p.upiAccountName}</div>
                        {p.adminTransactionRef && (
                          <div><strong>Transaction Ref:</strong> {p.adminTransactionRef}</div>
                        )}
                      </div>

                      {p.adminNote && (
                        <div style={{ padding: '0.5rem', background: 'var(--color-stone)', borderRadius: 'var(--radius-sm)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                          <strong>Admin Note:</strong> {p.adminNote}
                        </div>
                      )}

                      {p.status === 'requested' && (
                        <div className="booking-item-actions">
                           <button onClick={() => handleRejectPayout(p._id)} className="btn btn-outline btn-sm">❌ Reject Request</button>
                           <button onClick={() => handleHoldPayout(p._id)} className="btn btn-ghost btn-sm">⏳ Put on Hold</button>
                           <button onClick={() => openPayoutModal(p)} className="btn btn-accent btn-sm">💸 Mark as Paid</button>
                        </div>
                      )}
                      {p.status === 'on_hold' && (
                        <div className="booking-item-actions">
                           <button onClick={() => handleRejectPayout(p._id)} className="btn btn-outline btn-sm">❌ Reject Request</button>
                           <button onClick={() => openPayoutModal(p)} className="btn btn-accent btn-sm">💸 Mark as Paid</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: BOOKINGS */}
          {tab === 'bookings' && (
            <div className="bookings-tab animate-fade-in">
              <h3>All Marketplace Bookings</h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Historical list of guide booking transactions.</p>
              
              {bookings.length === 0 ? (
                <p className="text-muted" style={{ padding: '2rem 0' }}>No bookings found.</p>
              ) : (
                <table className="admin-list-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Guide</th>
                      <th>Tourist</th>
                      <th>Dates</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b._id}>
                        <td><Link to={`/booking/${b._id}`}>...{b._id.slice(-6)}</Link></td>
                        <td>{b.guideProfile?.displayName || 'Guide'}</td>
                        <td>{b.tourist?.name || 'Tourist'}</td>
                        <td>{new Date(b.startDate).toLocaleDateString()}</td>
                        <td>₹{b.totalPrice}</td>
                        <td>
                          <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                            <span className={`status-dot status-${b.status}`}></span>
                            <span style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{b.status.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 600 }}>{b.paymentStatus}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab Content: PLACES (CRUD ENABLED) */}
          {tab === 'places' && (
            <div className="places-tab animate-fade-in">
              <div className="flex flex-between" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h3>Monitored Places</h3>
                  <p className="text-muted">Places, treks, and locations active for bookings.</p>
                </div>
                <button onClick={openAddPlaceModal} className="btn btn-accent btn-sm">➕ Add New Place</button>
              </div>

              {places.length === 0 ? (
                <p className="text-muted">No places active.</p>
              ) : (
                <table className="admin-list-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Difficulty</th>
                      <th>Est. Duration</th>
                      <th>Entry Fee</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {places.map(p => (
                      <tr key={p._id}>
                        <td><strong>{p.name}</strong></td>
                        <td style={{ textTransform: 'capitalize' }}>{p.category}</td>
                        <td>{p.city}, {p.district}</td>
                        <td style={{ textTransform: 'capitalize' }}>{p.difficultyLevel}</td>
                        <td>{p.estimatedDuration || 'N/A'}</td>
                        <td>₹{p.entryFee}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => openEditPlaceModal(p)} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', color: 'var(--color-primary-light)' }}>✏️ Edit</button>
                          <button onClick={() => handleDeletePlace(p._id)} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', color: 'var(--color-danger)' }}>🗑️ Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab Content: REVENUE CHART */}
          {tab === 'revenue' && (
            <div className="revenue-tab animate-fade-in">
              <div className="flex flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div>
                  <h3>Revenue Analytics</h3>
                  <p className="text-muted">Monthly breakdown of platform revenue and commission.</p>
                </div>
                <select className="form-select" style={{ width: 'auto', minWidth: '120px' }} value={revenueYear} onChange={e => setRevenueYear(parseInt(e.target.value))}>
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>

              {!revenueData ? (
                <p className="text-muted">Loading revenue data...</p>
              ) : (() => {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const filled = months.map((name, i) => {
                  const found = revenueData.monthlyRevenue.find(m => m.month === i + 1);
                  return { name, revenue: found?.revenue || 0, commission: found?.commission || 0, bookings: found?.bookings || 0 };
                });
                const maxVal = Math.max(...filled.map(m => m.revenue), 1);
                const chartHeight = 280;
                const barWidth = 28;
                const gap = 4;

                return (
                  <>
                    <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                      <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-info">
                          <span className="stat-value">₹{revenueData.totalRevenue?.toLocaleString()}</span>
                          <span className="stat-label">Total Revenue ({revenueYear})</span>
                        </div>
                      </div>
                      <div className="stat-card accent">
                        <div className="stat-icon">📈</div>
                        <div className="stat-info">
                          <span className="stat-value">₹{revenueData.totalCommission?.toLocaleString()}</span>
                          <span className="stat-label">Platform Commission</span>
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ padding: 'var(--space-xl)', overflowX: 'auto' }}>
                      <svg width="100%" viewBox={`0 0 ${12 * (barWidth * 2 + gap * 3) + 60} ${chartHeight + 50}`} style={{ minWidth: '700px' }}>
                        {/* Y-axis labels */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                          <g key={i}>
                            <text x="50" y={chartHeight - pct * chartHeight + 5} textAnchor="end" fontSize="11" fill="var(--color-text-secondary)">
                              ₹{Math.round(maxVal * pct / 1000)}k
                            </text>
                            <line x1="55" y1={chartHeight - pct * chartHeight} x2={12 * (barWidth * 2 + gap * 3) + 55} y2={chartHeight - pct * chartHeight} stroke="var(--color-border)" strokeDasharray="4" />
                          </g>
                        ))}
                        {/* Bars */}
                        {filled.map((m, i) => {
                          const x = 60 + i * (barWidth * 2 + gap * 3);
                          const revH = (m.revenue / maxVal) * chartHeight;
                          const comH = (m.commission / maxVal) * chartHeight;
                          return (
                            <g key={i}>
                              <rect x={x} y={chartHeight - revH} width={barWidth} height={revH} rx={4} fill="var(--color-primary)" opacity={0.85}>
                                <title>{m.name}: ₹{m.revenue.toLocaleString()} revenue, {m.bookings} bookings</title>
                              </rect>
                              <rect x={x + barWidth + gap} y={chartHeight - comH} width={barWidth} height={comH} rx={4} fill="var(--color-accent)" opacity={0.85}>
                                <title>{m.name}: ₹{m.commission.toLocaleString()} commission</title>
                              </rect>
                              <text x={x + barWidth} y={chartHeight + 18} textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)">{m.name}</text>
                            </g>
                          );
                        })}
                      </svg>
                      <div className="flex gap-lg" style={{ marginTop: 'var(--space-md)', justifyContent: 'center' }}>
                        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                          <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--color-primary)', opacity: 0.85 }}></div>
                          <span className="text-sm text-muted">Total Revenue</span>
                        </div>
                        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                          <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--color-accent)', opacity: 0.85 }}></div>
                          <span className="text-sm text-muted">Platform Commission (15%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Breakdown Table */}
                    <table className="admin-list-table" style={{ marginTop: 'var(--space-xl)' }}>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Revenue</th>
                          <th>Commission</th>
                          <th>Bookings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filled.filter(m => m.revenue > 0).map(m => (
                          <tr key={m.name}>
                            <td><strong>{m.name}</strong></td>
                            <td>₹{m.revenue.toLocaleString()}</td>
                            <td>₹{m.commission.toLocaleString()}</td>
                            <td>{m.bookings}</td>
                          </tr>
                        ))}
                        {filled.filter(m => m.revenue > 0).length === 0 && (
                          <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center' }}>No revenue data for {revenueYear}.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </div>
          )}

          {/* Tab Content: USERS */}
          {tab === 'users' && (
            <div className="users-tab animate-fade-in">
              <div className="flex flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div>
                  <h3>All Users</h3>
                  <p className="text-muted">Registered users across all roles.</p>
                </div>
                <select className="form-select" style={{ width: 'auto', minWidth: '140px' }} value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                  <option value="">All Roles</option>
                  <option value="tourist">Tourist</option>
                  <option value="guide">Guide</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {users.length === 0 ? (
                <p className="text-muted" style={{ padding: '2rem 0' }}>No users found.</p>
              ) : (
                <table className="admin-list-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Phone</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td><span className={`badge badge-${u.role === 'admin' ? 'verified' : u.role === 'guide' ? 'pending' : 'default'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                        <td>{u.phone || '—'}</td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab Content: REVIEWS */}
          {tab === 'reviews' && (
            <div className="reviews-tab animate-fade-in">
              <h3>All Reviews</h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Tourist reviews for guides. Delete inappropriate content.</p>

              {reviews.length === 0 ? (
                <p className="text-muted" style={{ padding: '2rem 0' }}>No reviews found.</p>
              ) : (
                <div className="bookings-list">
                  {reviews.map(r => (
                    <div className="booking-item card" key={r._id}>
                      <div className="booking-item-header">
                        <div>
                          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#c9a84c' }}>{'\u2605'.repeat(r.rating)}{'\u2606'.repeat(5 - r.rating)}</span>
                            <span className="text-sm text-muted">({r.rating}/5)</span>
                          </h4>
                          <p className="text-muted text-sm">
                            Guide: <strong>{r.guideProfile?.displayName || 'Guide'}</strong> | Tourist: <strong>{r.user?.name || 'Tourist'}</strong>
                          </p>
                        </div>
                        <span className="text-sm text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ padding: 'var(--space-sm) 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>
                        "{r.review}"
                      </div>
                      <div className="booking-item-actions">
                        <button onClick={() => handleDeleteReview(r._id)} className="btn btn-outline btn-sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                          🗑️ Delete Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Guide Rejection Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card-glass" style={{
            background: 'var(--color-surface)', padding: '2rem',
            borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '90%'
          }}>
            <h3>Reject Guide Application</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>Please specify a feedback reason. The guide will receive this in an email and on their dashboard so they can correct their documents.</p>

            <form onSubmit={handleRejectGuideSubmit}>
              <div className="form-group">
                <label className="form-label">Rejection / Correction Feedback</label>
                <textarea
                  placeholder="e.g. ID proof is blurred and unreadable. Please upload a clear photo of your Aadhaar card."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="form-textarea"
                  required
                />
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowRejectModal(false)} className="btn btn-ghost btn-sm" disabled={rejectSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-outline btn-sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }} disabled={rejectSubmitting}>
                  {rejectSubmitting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Processing Modal */}
      {showPayoutModal && selectedPayout && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card-glass" style={{
            background: 'var(--color-surface)', padding: '2rem',
            borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '90%'
          }}>
            <h3>Confirm UPI Bank Transfer</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
              Transfer exactly <strong>₹{selectedPayout.amount}</strong> to the UPI ID: <br />
              <code style={{ fontSize: '1.1rem', color: 'var(--color-accent)', fontWeight: 700 }}>{selectedPayout.temporaryUpiId}</code> ({selectedPayout.upiAccountName})
            </p>

            <form onSubmit={handleMarkPaidSubmit}>
              <div className="form-group">
                <label className="form-label">UPI Reference / Transaction ID No.</label>
                <input
                  type="text"
                  placeholder="e.g. Txn Ref 315487954625"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admin Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Transferred via Paytm Business"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{
                fontSize: '0.75rem', color: 'var(--color-success)',
                background: 'rgba(45, 138, 78, 0.05)', padding: '0.5rem',
                borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem'
              }}>
                ✅ Confirming this clears the guide's temporary plain UPI ID from our database, saving only a masked UPI ID for guide security.
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowPayoutModal(false)} className="btn btn-ghost btn-sm" disabled={payoutSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={payoutSubmitting}>
                  {payoutSubmitting ? 'Confirming...' : 'Mark as PAID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Place CRUD Modal (Add/Edit Support with Multipart Cover Image Upload) */}
      {showPlaceModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card-glass" style={{
            background: 'var(--color-surface)', padding: '2rem',
            borderRadius: 'var(--radius-lg)', maxWidth: '560px', width: '90%',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3>{editingPlace ? '📝 Edit Monitored Place' : '🏰 Add New Place / Fort'}</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>Define Maharashtra historical fort or trek service points for guides.</p>

            <form onSubmit={handlePlaceSubmit}>
              <div className="form-group">
                <label className="form-label">Place/Fort Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Harishchandragad Fort"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select value={placeCategory} onChange={(e) => setPlaceCategory(e.target.value)} className="form-select">
                    <option value="fort">Fort</option>
                    <option value="trek">Trek / Valley</option>
                    <option value="heritage">Heritage Site</option>
                    <option value="spiritual">Spiritual / Caves</option>
                    <option value="village">Scenic Village</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Difficulty Level *</label>
                  <select value={placeDifficulty} onChange={(e) => setPlaceDifficulty(e.target.value)} className="form-select">
                    <option value="easy">Easy (Beginners)</option>
                    <option value="moderate">Moderate</option>
                    <option value="difficult">Difficult</option>
                    <option value="expert">Expert / Technical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-3">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input type="text" placeholder="e.g. Akole" value={placeCity} onChange={(e) => setPlaceCity(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">District *</label>
                  <input type="text" placeholder="e.g. Ahmednagar" value={placeDistrict} onChange={(e) => setPlaceDistrict(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" value={placeState} onChange={(e) => setPlaceState(e.target.value)} className="form-input" required />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Entry Fee (₹ INR)</label>
                  <input type="number" min={0} value={placeFee} onChange={(e) => setPlaceFee(parseInt(e.target.value) || 0)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Duration</label>
                  <input type="text" placeholder="e.g. 5-7 hours" value={placeDuration} onChange={(e) => setPlaceDuration(e.target.value)} className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">History & Description</label>
                <textarea
                  placeholder="Tell guides and tourists about the history, heritage story, and trekking routes of this location..."
                  value={placeDesc}
                  onChange={(e) => setPlaceDesc(e.target.value)}
                  className="form-textarea"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cover Image File Upload</label>
                <input type="file" accept="image/*" onChange={(e) => setPlaceImage(e.target.files[0])} className="form-input" />
                <span className="text-muted text-sm">Upload a gorgeous cover photo of the trek or fort.</span>
              </div>

              <div className="flex" style={{ justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowPlaceModal(false)} className="btn btn-ghost btn-sm" disabled={placeSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-accent btn-sm" disabled={placeSubmitting}>
                  {placeSubmitting ? 'Saving...' : '💾 Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
