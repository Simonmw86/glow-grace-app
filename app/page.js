'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import BookingForm from '@/components/BookingForm';
import Footer from '@/components/Footer';
import { SERVICES as DEFAULT_SERVICES, GALLERY as DEFAULT_GALLERY, MENU, LOGO_IMG, WHATSAPP_URL, formatKES } from '@/lib/data';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [galleryItems, setGalleryItems] = useState(DEFAULT_GALLERY);

  // Fetch live services from Supabase and merge them with hardcoded GALLERY items
  useEffect(() => {
    async function fetchGalleryData() {
      const { data, error } = await supabase.from('services').select('*').order('name');

      if (!error && data && data.length > 0) {
        // Normalize Supabase records into gallery card format ({ src, alt, label })
        const supabaseCards = data.map(s => {
          const imgUrl = s.image_url || s.image || s.imageUrl || '';
          return {
            src: imgUrl,
            alt: s.name,
            label: `${s.name} - ${formatKES(s.price)}`
          };
        }).filter(item => item.src); // Only include items that actually have an image URL

        // Combine hardcoded default gallery items with live database uploads
        setGalleryItems([...DEFAULT_GALLERY, ...supabaseCards]);
      } else {
        setGalleryItems(DEFAULT_GALLERY);
      }
    }

    fetchGalleryData();
  }, []);

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
            <h2>Hi, Im Joseph </h2>
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

      {/* Gallery Section retaining hardcoded and live Supabase items */}
      <section id="gallery" className="gallery-section">
        <div className="section-header">
          <h2>Recent Client Creation</h2>
          <p>Take a look at some of our signature looks before selecting your appointment option below.</p>
        </div>
        <div className="gallery-grid">
          {galleryItems.map((g, i) => (
            <div className="gallery-card" key={i}>
              <img src={g.src} alt={g.alt || 'Nail Art Creation'} />
              <div className="gallery-overlay"><span>{g.label}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* Services & Rate Menu Section */}
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

      {/* Booking Section */}
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