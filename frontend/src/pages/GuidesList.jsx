import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './GuidesList.css';

export default function GuidesList() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('-ratingsAverage');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Multiselect filters
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);

  const languagesList = ['Marathi', 'Hindi', 'English', 'Kannada', 'Gujarati'];
  const specialtiesList = [
    { value: 'history', label: 'Maratha History' },
    { value: 'trekking', label: 'Trekking & Safety' },
    { value: 'photography', label: 'Photography' },
    { value: 'food', label: 'Local Culinary' },
    { value: 'culture', label: 'Village Culture' },
    { value: 'family', label: 'Family Friendly' },
    { value: 'solo', label: 'Solo Adventurers' }
  ];

  useEffect(() => {
    fetchGuides();
  }, [sort, minPrice, maxPrice, selectedLanguages, selectedSpecialties]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const params = { sort };
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      
      if (selectedLanguages.length > 0) {
        params.language = selectedLanguages.join(',');
      }
      if (selectedSpecialties.length > 0) {
        params.specialty = selectedSpecialties.join(',');
      }

      const res = await api.get('/guides', { params });
      
      // Handle Mongoose generic list vs custom list formats
      const guidesArray = res.data?.data?.guides || res.data?.data?.data || (Array.isArray(res.data?.data) ? res.data.data : []);
      setGuides(guidesArray);
    } catch (err) {
      console.error('Failed to load guides:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const clearFilters = () => {
    setSelectedLanguages([]);
    setSelectedSpecialties([]);
    setMinPrice('');
    setMaxPrice('');
    setSort('-ratingsAverage');
  };

  return (
    <div className="guides-page">
      <div className="page-header">
        <div className="container">
          <h1>Find Local Guides</h1>
          <p>Book verified local experts for Maharashtra treks, forts, and cultural explorations</p>
        </div>
      </div>

      <div className="container section">
        <div className="guides-container">
          
          {/* Filters Sidebar */}
          <aside className="filters-sidebar" id="guides-filters-sidebar">
            <div className="flex flex-between">
              <h3 style={{ fontSize: '1.2rem' }}>Filters</h3>
              <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ padding: 0 }}>Reset All</button>
            </div>

            {/* Specialties Filter */}
            <div className="filter-group">
              <div className="filter-section-title">Specialties</div>
              {specialtiesList.map(spec => {
                const checked = selectedSpecialties.includes(spec.value);
                return (
                  <label className="checkbox-option" key={spec.value}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleSpecialtyToggle(spec.value)}
                    />
                    {spec.label}
                  </label>
                );
              })}
            </div>

            {/* Languages Filter */}
            <div className="filter-group">
              <div className="filter-section-title">Languages</div>
              {languagesList.map(lang => {
                const checked = selectedLanguages.includes(lang);
                return (
                  <label className="checkbox-option" key={lang}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleLanguageToggle(lang)}
                    />
                    {lang}
                  </label>
                );
              })}
            </div>

            {/* Price Range Filter */}
            <div className="filter-group">
              <div className="filter-section-title">Daily Price (₹)</div>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="form-input"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </aside>

          {/* Guides Results Area */}
          <main className="guides-results-main">
            <div className="results-meta">
              <h3>{loading ? 'Searching...' : `${guides.length} Live Guides Available`}</h3>
              
              <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                <span className="text-sm text-muted">Sort By:</span>
                <select className="form-select" value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '0.4rem 1rem', width: '200px' }} id="guides-sort">
                  <option value="-ratingsAverage">⭐ Highest Rated</option>
                  <option value="-experienceYears">🥾 Most Experienced</option>
                  <option value="pricePerDay">🪙 Price: Low to High</option>
                  <option value="-pricePerDay">🪙 Price: High to Low</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="loading-page">
                <div className="spinner"></div>
                <p>Finding local guides near you...</p>
              </div>
            ) : guides.length === 0 ? (
              <div className="empty-state text-center" style={{ padding: '4rem 0' }}>
                <span style={{ fontSize: '3rem' }}>🧭</span>
                <p className="text-muted" style={{ fontSize: '1.2rem', marginTop: '1rem' }}>No approved guides matched your selected filters.</p>
                <button onClick={clearFilters} className="btn btn-primary btn-sm" style={{ marginTop: '1.5rem' }}>Clear Filters</button>
              </div>
            ) : (
              <div className="grid grid-3">
                {guides.map(guide => (
                  <Link to={`/guides/${guide._id}`} className="guide-card card" key={guide._id}>
                    <div className="guide-card-header">
                      <img
                        src={`/img/guides/${guide.profilePhoto}`}
                        alt={guide.displayName}
                        className="guide-avatar"
                        onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guide.displayName) + '&background=1a3c2f&color=fff&size=120'; }}
                      />
                      <span className="badge badge-verified">✅ Verified</span>
                    </div>
                    <div className="guide-card-body">
                      <h4>{guide.displayName}</h4>
                      <p className="text-muted text-sm">📍 {guide.baseCity}</p>
                      
                      <div className="star-rating">
                        {'★'.repeat(Math.round(guide.ratingsAverage || 0))}{'☆'.repeat(5 - Math.round(guide.ratingsAverage || 0))}
                        <span className="star-value">{guide.ratingsAverage?.toFixed(1)}</span>
                        <span className="star-count">({guide.ratingsQuantity})</span>
                      </div>

                      <div className="guide-card-tags">
                        {guide.specialties?.slice(0, 2).map(s => <span className="tag" key={s}>🎯 {s}</span>)}
                        {guide.languages?.slice(0, 2).map(l => <span className="tag" key={l}>🗣️ {l}</span>)}
                      </div>

                      <div className="guide-card-price">
                        <div>
                          <span className="price-amount">₹{guide.pricePerDay}</span>
                          <span className="price-label">/ day</span>
                        </div>
                        <span className="btn btn-primary btn-sm" style={{ padding: '0.4rem 0.8rem' }}>View Profile</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}
