import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import './PlaceDetail.css';

export default function PlaceDetail() {
  const { slug } = useParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/places/slug/${slug}`)
      .then(res => { setPlace(res.data.data.place); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!place) return <div className="container section"><h2>Place not found</h2></div>;

  return (
    <div className="place-detail-page">
      <div className="place-hero">
        <img
          src={`/img/places/${place.imageCover}`}
          alt={place.name}
          className="place-hero-img"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=600&fit=crop'; }}
        />
        <div className="place-hero-overlay">
          <div className="container">
            <span className="badge badge-category">{place.category}</span>
            <h1>{place.name}</h1>
            <p className="place-location">📍 {place.city}, {place.district}, {place.state}</p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="place-detail-grid">
          <div className="place-info">
            <div className="place-meta-bar">
              <div className="meta-item">
                <span className="meta-label">Difficulty</span>
                <span className="tag" style={{textTransform: 'capitalize'}}>{place.difficultyLevel}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Duration</span>
                <span>{place.estimatedDuration || 'Half day'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Entry Fee</span>
                <span>{place.entryFee > 0 ? `₹${place.entryFee}` : 'Free'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Best Season</span>
                <span>{place.bestSeason || 'Year round'}</span>
              </div>
            </div>

            <div className="place-section">
              <h2>About this Place</h2>
              <p>{place.description}</p>
            </div>

            {place.history && (
              <div className="place-section">
                <h2>History</h2>
                <p>{place.history}</p>
              </div>
            )}
          </div>

          {/* Available Guides Sidebar */}
          <div className="place-sidebar">
            <div className="sidebar-card card">
              <h3>Available Guides</h3>
              <p className="text-muted text-sm" style={{marginBottom: 'var(--space-lg)'}}>Verified local experts for this place</p>
              {place.guides && place.guides.length > 0 ? (
                place.guides.map(guide => (
                  <Link to={`/guides/${guide._id}`} className="sidebar-guide" key={guide._id}>
                    <img
                      src={`/img/guides/${guide.profilePhoto}`}
                      alt={guide.displayName}
                      className="sidebar-guide-avatar"
                      onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guide.displayName) + '&background=1a3c2f&color=fff&size=48'; }}
                    />
                    <div>
                      <h4>{guide.displayName}</h4>
                      <div className="star-rating" style={{fontSize: '0.8rem'}}>
                        {'★'.repeat(Math.round(guide.ratingsAverage || 0))}
                        <span className="star-value">{guide.ratingsAverage?.toFixed(1)}</span>
                      </div>
                      <span className="price-amount" style={{fontSize: '0.95rem'}}>₹{guide.pricePerDay}/day</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-muted text-sm">No guides available yet. Check back soon!</p>
              )}
              <Link to="/guides" className="btn btn-outline" style={{marginTop: 'var(--space-md)', width: '100%'}}>
                Browse All Guides
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
