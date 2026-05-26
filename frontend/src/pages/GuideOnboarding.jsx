import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css'; // Reuse auth glass container styling + add custom wizard styles

export default function GuideOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [baseCity, setBaseCity] = useState('');
  const [experienceYears, setExperienceYears] = useState(1);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);

  const [pricePerDay, setPricePerDay] = useState(1000);
  const [halfDayPrice, setHalfDayPrice] = useState(600);
  const [maxGroupSize, setMaxGroupSize] = useState(10);
  const [travelRadiusKm, setTravelRadiusKm] = useState(50);

  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);

  // Verification files
  const [idProof, setIdProof] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
  const [certificate, setCertificate] = useState(null);

  // Dynamic pricing
  const [pricingRules, setPricingRules] = useState([]);
  const [advanceDays, setAdvanceDays] = useState(0);
  const [advanceDiscount, setAdvanceDiscount] = useState(0);
  const [weekendSurcharge, setWeekendSurcharge] = useState(0);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const languagesList = ['Marathi', 'Hindi', 'English', 'Kannada', 'Gujarati', 'German', 'French'];
  const specialtiesList = [
    { value: 'history', label: 'Maratha History & Architecture' },
    { value: 'trekking', label: 'High Altitude Trekking' },
    { value: 'photography', label: 'Landscape Photography' },
    { value: 'food', label: 'Local Maharashtrian Culinary' },
    { value: 'culture', label: 'Village Culture & Homestays' },
    { value: 'family', label: 'Family & Children friendly tours' },
    { value: 'solo', label: 'Solo travelers guidance' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch existing profile if any
        const profileRes = await api.get('/guide-profiles/me');
        if (profileRes.data.data.profile) {
          const p = profileRes.data.data.profile;
          setDisplayName(p.displayName || '');
          setBio(p.bio || '');
          setBaseCity(p.baseCity || '');
          setExperienceYears(p.experienceYears || 1);
          setPricePerDay(p.pricePerDay || 1000);
          setHalfDayPrice(p.halfDayPrice || 600);
          setMaxGroupSize(p.maxGroupSize || 10);
          setTravelRadiusKm(p.travelRadiusKm || 50);
          setSelectedLanguages(p.languages || []);
          setSelectedSpecialties(p.specialties || []);
          setSelectedPlaces(p.serviceLocations?.map(loc => loc._id) || []);
          setPricingRules(p.pricingRules || []);
          setAdvanceDays(p.advanceBookingDiscount?.daysInAdvance || 0);
          setAdvanceDiscount(p.advanceBookingDiscount?.discountPercent || 0);
          setWeekendSurcharge(p.weekendSurchargePercent || 0);
        }

        // Fetch places for service location checklist
        const placesRes = await api.get('/places?limit=100');
        setPlaces(placesRes.data.data.data || []);
      } catch (err) {
        console.error('Failed to load initial onboarding data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLanguageToggle = (lang) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleSpecialtyToggle = (spec) => {
    setSelectedSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handlePlaceToggle = (placeId) => {
    setSelectedPlaces(prev =>
      prev.includes(placeId) ? prev.filter(p => p !== placeId) : [...prev, placeId]
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!displayName.trim()) return alert('Display Name is required.');
      if (!bio.trim() || bio.length < 30) return alert('Bio is required and must be at least 30 characters.');
      if (!baseCity.trim()) return alert('Base City is required.');
    }
    if (step === 2) {
      if (selectedLanguages.length === 0) return alert('Select at least one language.');
      if (selectedSpecialties.length === 0) return alert('Select at least one specialty.');
    }
    if (step === 3) {
      if (pricePerDay <= 0) return alert('Enter a valid price per day.');
      if (maxGroupSize <= 0) return alert('Enter a valid max group size.');
    }
    if (step === 4) {
      if (selectedPlaces.length === 0) return alert('Select at least one place/fort you want to serve.');
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep() === true) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idProof || !addressProof) {
      return alert('Please upload both ID Proof and Address Proof for verification.');
    }
    setSubmitting(true);

    try {
      // 1. Submit text profile details and profile photo first
      const formData = new FormData();
      formData.append('displayName', displayName);
      formData.append('bio', bio);
      formData.append('baseCity', baseCity);
      formData.append('experienceYears', experienceYears);
      formData.append('pricePerDay', pricePerDay);
      formData.append('halfDayPrice', halfDayPrice);
      formData.append('maxGroupSize', maxGroupSize);
      formData.append('travelRadiusKm', travelRadiusKm);

      selectedLanguages.forEach(lang => formData.append('languages[]', lang));
      selectedSpecialties.forEach(spec => formData.append('specialties[]', spec));
      selectedPlaces.forEach(placeId => formData.append('serviceLocations[]', placeId));

      // Dynamic pricing
      if (pricingRules.length > 0) {
        formData.append('pricingRules', JSON.stringify(pricingRules));
      }
      formData.append('advanceBookingDiscount', JSON.stringify({
        daysInAdvance: advanceDays,
        discountPercent: advanceDiscount
      }));
      formData.append('weekendSurchargePercent', weekendSurcharge);

      if (profilePhoto) {
        formData.append('profilePhoto', profilePhoto);
      }

      await api.post('/guide-profiles/onboarding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 2. Submit verification documents
      const docsData = new FormData();
      docsData.append('idProof', idProof);
      docsData.append('addressProof', addressProof);
      if (certificate) {
        docsData.append('certificate', certificate);
      }

      // Add other text fields to save just in case, per route spec
      docsData.append('displayName', displayName);
      docsData.append('baseCity', baseCity);
      docsData.append('pricePerDay', pricePerDay);

      await api.post('/guide-profiles/submit-verification', docsData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Profile details and documents submitted for verification successfully!');
      navigate('/dashboard/guide');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit onboarding details');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p>Loading onboarding workspace...</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="card card-glass" style={{ maxWidth: '640px', width: '95%', padding: '2.5rem' }}>
        
        {/* Progress Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="flex flex-between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-accent" style={{ fontWeight: 700 }}>STEP {step} OF 5</span>
            <span className="text-muted text-sm">{step === 1 ? 'About You' : step === 2 ? 'Skills & Languages' : step === 3 ? 'Pricing & Sizing' : step === 4 ? 'Choose Forts/Places' : 'Verification Docs'}</span>
          </div>
          <div style={{ background: 'var(--color-border)', height: '6px', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--color-accent)', height: '100%', width: `${(step / 5) * 100}%`, transition: 'width 0.3s ease' }}></div>
          </div>
        </div>

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem' }}>Tell trekkers about yourself</h2>
            
            <div className="form-group">
              <label className="form-label">Professional Display Name</label>
              <input
                type="text"
                placeholder="e.g. Guide Rajesh Patil"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Profile Bio (Trekkers see this before booking)</label>
              <textarea
                placeholder="Introduce yourself! Talk about your history knowledge, connection to Sahyadri, safety record, and favorite treks..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="form-textarea"
                rows={5}
                required
              />
              <span className="text-muted text-sm">Must be at least 30 characters.</span>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Base Operating City</label>
                <input
                  type="text"
                  placeholder="e.g. Pune, Satara, Nashik"
                  value={baseCity}
                  onChange={(e) => setBaseCity(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Years of Trekking Experience</label>
                <input
                  type="number"
                  min={1}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(parseInt(e.target.value) || 1)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Profile Photo (Face clearly visible)</label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="form-input" />
              {profilePhotoPreview && (
                <img
                  src={profilePhotoPreview}
                  alt="Preview"
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', marginTop: '1rem', border: '2px solid var(--color-accent)' }}
                />
              )}
            </div>

            <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button onClick={nextStep} className="btn btn-primary">Next: Skills & Specialties ➡️</button>
            </div>
          </div>
        )}

        {/* STEP 2: Specialties & Languages */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem' }}>Select your Skills & Languages</h2>

            <div className="form-group">
              <label className="form-label">Languages Spoken (Select all that apply)</label>
              <div className="flex" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {languagesList.map(lang => {
                  const active = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLanguageToggle(lang)}
                      className={`btn btn-sm ${active ? 'btn-accent' : 'btn-outline'}`}
                      style={{ borderRadius: 'var(--radius-full)' }}
                    >
                      {lang} {active ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '2rem' }}>
              <label className="form-label">Specialties & Domains (Select all that apply)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {specialtiesList.map(spec => {
                  const active = selectedSpecialties.includes(spec.value);
                  return (
                    <button
                      key={spec.value}
                      type="button"
                      onClick={() => handleSpecialtyToggle(spec.value)}
                      className={`btn btn-sm`}
                      style={{
                        justifyContent: 'flex-start',
                        background: active ? 'rgba(212, 120, 47, 0.1)' : 'var(--color-surface)',
                        color: active ? 'var(--color-accent-dark)' : 'var(--color-text)',
                        border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        textAlign: 'left'
                      }}
                    >
                      {active ? '🔶' : '▫️'} {spec.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex" style={{ justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button onClick={prevStep} className="btn btn-ghost">⬅️ Back</button>
              <button onClick={nextStep} className="btn btn-primary">Next: Pricing & Group ➡️</button>
            </div>
          </div>
        )}

        {/* STEP 3: Pricing & Group Details */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem' }}>Define your Pricing & Capacity</h2>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Daily Price (₹ INR / Day)</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(parseInt(e.target.value) || 0)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Half Day Price (₹ INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 900"
                  value={halfDayPrice}
                  onChange={(e) => setHalfDayPrice(parseInt(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Max Group Size (Guests)</label>
                <input
                  type="number"
                  value={maxGroupSize}
                  onChange={(e) => setMaxGroupSize(parseInt(e.target.value) || 1)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Travel Radius (Operating km)</label>
                <input
                  type="number"
                  value={travelRadiusKm}
                  onChange={(e) => setTravelRadiusKm(parseInt(e.target.value) || 1)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* ─── Dynamic Pricing Section ─────────────────────── */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--color-stone)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ marginBottom: '0.25rem', color: 'var(--color-primary-dark)' }}>⚡ Dynamic Pricing (Optional)</h3>
              <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>Set seasonal rates, weekend surcharges, and early-bird discounts. Leave empty to use flat pricing.</p>

              {/* Seasonal Rules */}
              <label className="form-label" style={{ fontWeight: 700 }}>Seasonal Pricing Rules</label>
              {pricingRules.map((rule, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Name (e.g. monsoon)"
                    value={rule.name}
                    onChange={e => {
                      const updated = [...pricingRules];
                      updated[idx].name = e.target.value;
                      setPricingRules(updated);
                    }}
                    className="form-input"
                    style={{ flex: '1', minWidth: '100px' }}
                  />
                  <select
                    value={rule.startMonth}
                    onChange={e => {
                      const updated = [...pricingRules];
                      updated[idx].startMonth = parseInt(e.target.value);
                      setPricingRules(updated);
                    }}
                    className="form-select"
                    style={{ width: '85px' }}
                  >
                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>to</span>
                  <select
                    value={rule.endMonth}
                    onChange={e => {
                      const updated = [...pricingRules];
                      updated[idx].endMonth = parseInt(e.target.value);
                      setPricingRules(updated);
                    }}
                    className="form-select"
                    style={{ width: '85px' }}
                  >
                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="3"
                      value={rule.multiplier}
                      onChange={e => {
                        const updated = [...pricingRules];
                        updated[idx].multiplier = parseFloat(e.target.value) || 1;
                        setPricingRules(updated);
                      }}
                      className="form-input"
                      style={{ width: '70px' }}
                    />
                    <span className="text-muted text-sm">×</span>
                  </div>
                  <button type="button" onClick={() => setPricingRules(pricingRules.filter((_, i) => i !== idx))} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', padding: '0.25rem 0.5rem' }}>✕</button>
                  {/* Live preview for this rule */}
                  <span className="text-sm" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                    = ₹{Math.round(pricePerDay * rule.multiplier)}/day
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPricingRules([...pricingRules, { name: '', startMonth: 1, endMonth: 3, multiplier: 1 }])}
                className="btn btn-outline btn-sm"
                style={{ marginTop: '0.5rem' }}
              >
                + Add Season Rule
              </button>

              {/* Weekend Surcharge */}
              <div className="grid grid-2" style={{ marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Weekend Surcharge (Saturday) %</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={weekendSurcharge}
                    onChange={e => setWeekendSurcharge(parseInt(e.target.value) || 0)}
                    className="form-input"
                    placeholder="e.g. 10"
                  />
                  {weekendSurcharge > 0 && (
                    <span className="text-sm text-muted">Saturday treks: ₹{Math.round(pricePerDay * (1 + weekendSurcharge / 100))}/day</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Early Bird Discount</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={advanceDays}
                      onChange={e => setAdvanceDays(parseInt(e.target.value) || 0)}
                      className="form-input"
                      style={{ width: '80px' }}
                      placeholder="Days"
                    />
                    <span className="text-sm text-muted">days early →</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={advanceDiscount}
                      onChange={e => setAdvanceDiscount(parseInt(e.target.value) || 0)}
                      className="form-input"
                      style={{ width: '70px' }}
                      placeholder="%"
                    />
                    <span className="text-sm text-muted">% off</span>
                  </div>
                  {advanceDays > 0 && advanceDiscount > 0 && (
                    <span className="text-sm text-muted">Book {advanceDays}+ days early: ₹{Math.round(pricePerDay * (1 - advanceDiscount / 100))}/day</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex" style={{ justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button onClick={prevStep} className="btn btn-ghost">⬅️ Back</button>
              <button onClick={nextStep} className="btn btn-primary">Next: Service Locations ➡️</button>
            </div>
          </div>
        )}

        {/* STEP 4: Choose Locations */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '0.5rem' }}>Where do you guide?</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>Select the forts, treks, and locations you can confidently guide guests to.</p>

            <div className="form-group" style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {places.length === 0 ? (
                <p className="text-muted">No monitored places available in database.</p>
              ) : (
                places.map(place => {
                  const active = selectedPlaces.includes(place._id);
                  return (
                    <div
                      key={place._id}
                      onClick={() => handlePlaceToggle(place._id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                        background: active ? 'var(--color-stone)' : 'transparent',
                        border: `1px solid ${active ? 'var(--color-primary-light)' : 'var(--color-border)'}`,
                        cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                    >
                      <input type="checkbox" checked={active} onChange={() => {}} style={{ cursor: 'pointer' }} />
                      <div>
                        <strong>{place.name}</strong>
                        <p className="text-sm text-muted" style={{ textTransform: 'capitalize' }}>{place.category} | {place.city}, {place.district}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex" style={{ justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button onClick={prevStep} className="btn btn-ghost">⬅️ Back</button>
              <button onClick={nextStep} className="btn btn-primary">Next: Upload Verification ➡️</button>
            </div>
          </div>
        )}

        {/* STEP 5: Verification Documents */}
        {step === 5 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '0.5rem' }}>Secure Document Verification</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>Upload files to prove identity and qualifications. Documents are stored in a private secure folder and are only accessible by admins.</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">ID Proof (Aadhaar / Passport / Voter ID) *</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setIdProof(e.target.files[0])}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address Proof (Electricity Bill / Rent Agreement) *</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setAddressProof(e.target.files[0])}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trekking / First-Aid Certificate (Optional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setCertificate(e.target.files[0])}
                  className="form-input"
                />
              </div>

              <div style={{
                fontSize: '0.75rem', color: 'var(--color-text-secondary)',
                background: 'var(--color-stone)', padding: '0.75rem',
                borderRadius: 'var(--radius-sm)', marginBottom: '2rem', borderLeft: '3px solid var(--color-accent)'
              }}>
                ℹ️ By submitting, you agree that your details are accurate. We review and verify guide documents manually within 24-48 hours. Once verified, your status will show approved, and you will be listed live on Sahyadri Saathi.
              </div>

              <div className="flex" style={{ justifyContent: 'space-between' }}>
                <button type="button" onClick={prevStep} className="btn btn-ghost" disabled={submitting}>⬅️ Back</button>
                <button type="submit" className="btn btn-accent" disabled={submitting}>
                  {submitting ? 'Submitting Application...' : '🚀 Submit Application'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
