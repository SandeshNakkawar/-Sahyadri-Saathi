import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🏔️</span>
          <span className="brand-text">Sahyadri Saathi</span>
        </Link>

        <div className="navbar-links">
          <Link to="/places" className="nav-link">Explore Places</Link>
          <Link to="/guides" className="nav-link">Find Guides</Link>

          {!user ? (
            <div className="nav-auth">
              <Link to="/login" className="btn btn-ghost">Log In</Link>
              <Link to="/signup" className="btn btn-accent btn-sm">Sign Up</Link>
            </div>
          ) : (
            <div className="nav-user">
              {user.role === 'tourist' && (
                <>
                  <Link to="/dashboard/tourist" className="nav-link">My Bookings</Link>
                  <Link to="/chat" className="nav-link">💬 Messages</Link>
                </>
              )}
              {user.role === 'guide' && (
                <>
                  <Link to="/dashboard/guide" className="nav-link">Guide Dashboard</Link>
                  <Link to="/chat" className="nav-link">💬 Messages</Link>
                </>
              )}
              {user.role === 'admin' && (
                <Link to="/dashboard/admin" className="nav-link">Admin Panel</Link>
              )}
              <div className="nav-profile-menu">
                <button className="nav-profile-btn" id="nav-profile-btn">
                  <img
                    src={`/img/users/${user.photo || 'default.jpg'}`}
                    alt={user.name}
                    className="nav-avatar"
                    onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=1a3c2f&color=fff'; }}
                  />
                  <span className="nav-username">{user.name.split(' ')[0]}</span>
                </button>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm" id="logout-btn">
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
