import { CONTACT_EMAIL } from '@/lib/data';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h3>Glow &amp; Grace Nails</h3>
          <p>Premium beauty and certified nail artistry services in Nairobi</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Direct Email:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="footer-email-link">{CONTACT_EMAIL}</a>
          </p>
        </div>
        <div className="footer-links">
          <a href="#about" className="footer-link">About</a>
          <a href="#gallery" className="footer-link">Gallery</a>
          <a href="#services-pricing" className="footer-link">Pricing</a>
          <a href="#booking" className="footer-link">Book Now</a>
        </div>
        <p className="copyright">&copy; {new Date().getFullYear()} Simon tech. All rights reserved.</p>
      </div>
    </footer>
  );
}
