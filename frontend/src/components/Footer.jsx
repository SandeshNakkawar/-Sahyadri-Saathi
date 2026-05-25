import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>🏔️ Sahyadri Saathi</h3>
            <p>Your trusted companion for exploring Maharashtra's forts, treks, and heritage. Connect with verified local guides for authentic experiences.</p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/places">All Places</Link>
            <Link to="/guides">Find Guides</Link>
            <Link to="/signup?role=guide">Become a Guide</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Safety Guidelines</a>
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <a href="mailto:hello@sahyadrisaathi.com">hello@sahyadrisaathi.com</a>
            <p className="text-muted text-sm" style={{marginTop: '0.5rem'}}>Built with ❤️ for Maharashtra</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Sahyadri Saathi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
