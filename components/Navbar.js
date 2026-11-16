import { BRAND, LOGO_IMG } from '@/lib/data';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <a href="#hero" className="nav-brand">
          <img src={LOGO_IMG} alt="Logo" />
          <span className="nav-title">{BRAND}</span>
        </a>
        <ul className="nav-links">
          <li><a href="#about">About Tech</a></li>
          <li><a href="#gallery">Portfolio</a></li>
          <li><a href="#services-pricing">Pricing Menu</a></li>
          <li><a href="#booking" className="nav-btn">Book Appointment</a></li>
        </ul>
      </div>
    </nav>
  );
}
