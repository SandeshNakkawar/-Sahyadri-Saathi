import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState(searchParams.get('role') || 'tourist');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const user = await signup({ name, email, password, passwordConfirm, role, phone });
      if (user.role === 'guide') navigate('/guide-onboarding');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card-glass">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p className="text-muted">Join the Sahyadri Saathi community</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} id="signup-form">
          <div className="form-group">
            <label className="form-label">I am a...</label>
            <div className="role-selector">
              <button type="button" className={`role-btn ${role === 'tourist' ? 'active' : ''}`} onClick={() => setRole('tourist')} id="role-tourist">
                🧳 Tourist
              </button>
              <button type="button" className={`role-btn ${role === 'guide' ? 'active' : ''}`} onClick={() => setRole('guide')} id="role-guide">
                🧭 Guide
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" id="signup-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" id="signup-email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input type="tel" className="form-input" id="signup-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91-9876543210" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" id="signup-password" value={password} onChange={e => setPassword(e.target.value)} minLength="8" required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type="password" className="form-input" id="signup-password-confirm" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{width: '100%'}} disabled={loading} id="signup-submit">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
}
