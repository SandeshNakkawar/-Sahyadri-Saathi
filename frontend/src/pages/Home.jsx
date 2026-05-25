import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './Home.css';

export default function Home() {
  const [featuredPlaces, setFeaturedPlaces] = useState([]);
  const [topGuides, setTopGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/places?featured=true&limit=4').catch(() => ({ data: { data: { data: [] } } })),
      api.get('/guides?limit=4&sort=-ratingsAverage').catch(() => ({ data: { data: { guides: [] } } }))
    ]).then(([placesRes, guidesRes]) => {
      const placesArray = placesRes.data?.data?.data || placesRes.data?.data?.places || (Array.isArray(placesRes.data?.data) ? placesRes.data.data : []);
      const guidesArray = guidesRes.data?.data?.guides || guidesRes.data?.data?.data || (Array.isArray(guidesRes.data?.data) ? guidesRes.data.data : []);
      
      setFeaturedPlaces(placesArray);
      setTopGuides(guidesArray);
      setLoading(false);
    });
  }, []);

  return (
    <div className="home-page">
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <section className="hero" id="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content container">
          <span className="hero-tagline animate-fade-in-up">🏔️ Explore Maharashtra with Local Experts</span>
          <h1 className="hero-title animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            Discover the <span className="text-gradient">Sahyadri</span> with a
            <span className="text-gradient"> Trusted Guide</span>
          </h1>
          <p className="hero-desc animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            Book verified local guides for Maharashtra's legendary forts, ancient treks, 
            and hidden heritage gems. No tour packages — just real people, real stories.
          </p>
          <div className="hero-actions animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <Link to="/places" className="btn btn-accent btn-lg">
              🗺️ Explore Places
            </Link>
            <Link to="/guides" className="btn btn-outline btn-lg" style={{color: 'white', borderColor: 'rgba(255,255,255,0.5)'}}>
              🧭 Find a Guide
            </Link>
          </div>
          <div className="hero-stats animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <div className="hero-stat">
              <span className="stat-number">50+</span>
              <span className="stat-label">Historic Places</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">100+</span>
              <span className="stat-label">Verified Guides</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">1000+</span>
              <span className="stat-label">Happy Travelers</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why Sahyadri Saathi ───────────────────────────────── */}
      <section className="section trust-section" id="trust-section">
        <div className="container">
          <h2 className="section-title text-center">Why <span className="text-accent">Sahyadri Saathi</span>?</h2>
          <p className="section-subtitle text-center text-muted">Not just another tour package — a guide who becomes your friend.</p>
          <div className="grid grid-3 trust-cards">
            <div className="trust-card">
              <div className="trust-icon">✅</div>
              <h3>Verified Local Guides</h3>
              <p>Every guide is document-verified and reviewed by our team. We check ID proof, experience, and local knowledge.</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon">🛡️</div>
              <h3>Secure Payments</h3>
              <p>Pay through Stripe. Money is released to the guide only after you confirm the trip is completed successfully.</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon">💬</div>
              <h3>Direct Chat</h3>
              <p>Chat with your guide before and during the trip. Ask questions, share preferences, and customize your experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Places ───────────────────────────────────── */}
      {featuredPlaces.length > 0 && (
        <section className="section featured-section" id="featured-places">
          <div className="container">
            <div className="flex-between" style={{marginBottom: 'var(--space-xl)'}}>
              <div>
                <h2 className="section-title">Featured Places</h2>
                <p className="text-muted">Legendary forts and trails waiting for you</p>
              </div>
              <Link to="/places" className="btn btn-outline">View All →</Link>
            </div>
            <div className="grid grid-4">
              {featuredPlaces.map((place, i) => (
                <Link to={`/places/${place.slug}`} className="place-card card" key={place._id} style={{animationDelay: `${i * 0.1}s`}}>
                  <div className="place-card-img">
                    <img
                      src={`/img/places/${place.imageCover}`}
                      alt={place.name}
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop'; }}
                    />
                    <span className="badge badge-category">{place.category}</span>
                  </div>
                  <div className="place-card-body">
                    <h4>{place.name}</h4>
                    <p className="text-muted text-sm">{place.city}, {place.district}</p>
                    <div className="place-card-meta">
                      <span className="tag">{place.difficultyLevel || 'moderate'}</span>
                      {place.entryFee > 0 && <span className="tag">₹{place.entryFee}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Top Guides ───────────────────────────────────────── */}
      {topGuides.length > 0 && (
        <section className="section guides-showcase" id="top-guides">
          <div className="container">
            <div className="flex-between" style={{marginBottom: 'var(--space-xl)'}}>
              <div>
                <h2 className="section-title">Top Rated Guides</h2>
                <p className="text-muted">Passionate locals who bring history alive</p>
              </div>
              <Link to="/guides" className="btn btn-outline">Browse All →</Link>
            </div>
            <div className="grid grid-4">
              {topGuides.map((guide, i) => (
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
                    <p className="text-muted text-sm">{guide.baseCity}</p>
                    <div className="star-rating">
                      {'★'.repeat(Math.round(guide.ratingsAverage || 0))}{'☆'.repeat(5 - Math.round(guide.ratingsAverage || 0))}
                      <span className="star-value">{guide.ratingsAverage?.toFixed(1)}</span>
                      <span className="star-count">({guide.ratingsQuantity})</span>
                    </div>
                    <div className="guide-card-tags">
                      {guide.languages?.slice(0, 3).map(l => <span className="tag" key={l}>{l}</span>)}
                    </div>
                    <div className="guide-card-price">
                      <span className="price-amount">₹{guide.pricePerDay}</span>
                      <span className="price-label">/ day</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="cta-section" id="cta-section">
        <div className="container text-center">
          <h2>Are you a Local Guide?</h2>
          <p>Share your knowledge of Maharashtra's heritage. Join Sahyadri Saathi, get verified, and start earning by guiding travelers.</p>
          <Link to="/signup?role=guide" className="btn btn-accent btn-lg">
            🧭 Become a Guide
          </Link>
        </div>
      </section>
    </div>
  );
}
