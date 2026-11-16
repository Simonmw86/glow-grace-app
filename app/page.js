import Navbar from '@/components/Navbar';
import BookingForm from '@/components/BookingForm';
import Footer from '@/components/Footer';
import { GALLERY, MENU, LOGO_IMG, WHATSAPP_URL, formatKES } from '@/lib/data';

export default function Home() {
  return (
    <>
      <Navbar />

      <header id="hero" className="hero-section">
        <div className="hero-content">
          <h1>Flawless Nails, Crafted with Grace</h1>
          <p>Luxury gel manicures, custom acrylic sets, and precision nail artistry tailored just for you.</p>
          <div className="hero-action">
            <a href="#booking" className="btn-primary">Book your Session</a>
            <a href="#gallery" className="btn-secondary">View Artwork</a>
          </div>
        </div>
      </header>

      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-image-wrapper">
            <img src={LOGO_IMG} alt="Joseph Nail Tech" className="about-provider-img" />
          </div>
          <div className="about-text">
            <span className="badge">Meet your Technician</span>
            <h2>Hi, I&apos;m Joseph 👋</h2>
            <p>
              With over 3 years of certified nail tech experience, I specialize in non-damaging gel
              manicures, structural acrylic build-ups, and hand-painted nail art. My focus is on nail
              hygiene, health, and delivering long-lasting, aesthetic perfection for every client.
            </p>
            <div className="about-highlights">
              <div className="highlight-item"><strong>3+ Years</strong><span>Experience</span></div>
              <div className="highlight-item"><strong>100%</strong><span>Sanitized Tools</span></div>
              <div className="highlight-item"><strong>Custom</strong><span>Hand-painted Art</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="gallery" className="gallery-section">
        <div className="section-header">
          <h2>Recent Client Creation</h2>
          <p>Take a look at some of our signature looks before selecting your appointment option below.</p>
        </div>
        <div className="gallery-grid">
          {GALLERY.map((g, i) => (
            <div className="gallery-card" key={i}>
              <img src={g.src} alt={g.alt} />
              <div className="gallery-overlay"><span>{g.label}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section id="services-pricing" className="pricing-menu-section">
        <div className="section-header">
          <h2>Services &amp; Rate Menu</h2>
          <p>Transparent pricing for all nail treatments and custom embellishments.</p>
        </div>
        <div className="menu-grid">
          {MENU.map((cat) => (
            <div className="menu-category" key={cat.title}>
              <h3>{cat.title}</h3>
              <ul>
                {cat.items.map(([name, price]) => (
                  <li key={name}><span>{name}</span><strong>{formatKES(price)}</strong></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="booking" className="booking-section">
        <div className="booking-container">
          <div className="section-header">
            <h2>Reserve Your Appointment</h2>
            <p>Select your desired services, pick your slot, and attach reference images.</p>
          </div>
          <BookingForm />
        </div>
      </section>

      <Footer />

      <a href={WHATSAPP_URL} className="whatsapp-float" target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp">
        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp Chat" />
      </a>
    </>
  );
}
