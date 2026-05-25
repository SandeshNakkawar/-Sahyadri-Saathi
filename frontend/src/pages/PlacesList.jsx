import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './PlacesList.css';

export default function PlacesList() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category) params.category = category;
    if (difficulty) params.difficultyLevel = difficulty;

    api.get('/places', { params })
      .then(res => {
        const placesArray = res.data?.data?.data || res.data?.data?.places || (Array.isArray(res.data?.data) ? res.data.data : []);
        setPlaces(placesArray);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, difficulty]);

  return (
    <div className="places-page">
      <div className="page-header">
        <div className="container">
          <h1>Explore Maharashtra</h1>
          <p className="text-muted">Forts, treks, heritage, and more — discover your next adventure</p>
        </div>
      </div>

      <div className="container section">
        <div className="filter-bar" id="places-filter-bar">
          <div className="filter-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)} id="filter-category">
              <option value="">All Categories</option>
              <option value="fort">🏰 Forts</option>
              <option value="trek">🥾 Treks</option>
              <option value="heritage">🏛️ Heritage</option>
              <option value="spiritual">🛕 Spiritual</option>
              <option value="village">🏘️ Village</option>
              <option value="city">🏙️ City</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="form-label">Difficulty</label>
            <select className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value)} id="filter-difficulty">
              <option value="">All Levels</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="difficult">Difficult</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner"></div><p>Loading places...</p></div>
        ) : places.length === 0 ? (
          <div className="empty-state text-center">
            <p className="text-muted" style={{fontSize: '1.2rem', marginTop: '3rem'}}>No places found. Try adjusting filters.</p>
          </div>
        ) : (
          <div className="grid grid-3 places-grid">
            {places.map((place, i) => (
              <Link to={`/places/${place.slug}`} className="place-card card animate-fade-in-up" key={place._id} style={{animationDelay: `${i * 0.05}s`}}>
                <div className="place-card-img">
                  <img
                    src={`/img/places/${place.imageCover}`}
                    alt={place.name}
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop'; }}
                  />
                  <span className="badge badge-category">{place.category}</span>
                </div>
                <div className="place-card-body">
                  <h4>{place.name}</h4>
                  <p className="text-muted text-sm">{place.city}, {place.district}</p>
                  <p className="place-desc text-sm">{place.description?.substring(0, 100)}...</p>
                  <div className="place-card-meta">
                    <span className="tag">{place.difficultyLevel || 'moderate'}</span>
                    <span className="tag">{place.estimatedDuration}</span>
                    {place.entryFee > 0 && <span className="tag">₹{place.entryFee}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
