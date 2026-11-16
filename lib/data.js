export const BRAND = 'Glow & Grace';
export const CONTACT_EMAIL = 'Simonnmwass360@gmail.com'; // make sure this is the real address
export const WHATSAPP_URL =
  "https://wa.me/254704954127?text=Hello%20Joseph,%20I'm%20inquiring%20about%20your%20nail%20services.";

export const LOGO_IMG =
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=100&auto=format&fit=crop&q=80';

export const GALLERY = [
  { src: LOGO_IMG, alt: 'Gel Manicure', label: 'Gel Manicure Finish' },
  { src: LOGO_IMG, alt: 'Acrylic Sculpting', label: 'Acrylic Sculpting' },
  { src: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=500&auto=format&fit=crop&q=80', alt: 'Spa Pedicure', label: 'Luxury Spa Pedicure' },
  { src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80', alt: 'Nail Artistry', label: 'Custom Nail Artistry' },
];

export const MENU = [
  { title: 'Classic & Gel Treatments', items: [['Gel Manicure', 1500], ['Gel Polish Change', 1000], ['Pedicure & Spa Soak', 1800]] },
  { title: 'Acrylic Extensions', items: [['Acrylic Full Set', 2500], ['Acrylic Refil / Overlay', 1800], ['Soak Off & Nail Prep', 500]] },
  { title: 'Add-Ons & Artistry', items: [['Custom Hand Art (Per Accent)', 800], ['Rhinestones & Chrome Add-on', 600]] },
];

// Bookable services (used by the form)
export const SERVICES = [
  { id: 'gel', name: 'Gel Manicure', price: 1500 },
  { id: 'acrylic', name: 'Acrylic Full Set', price: 2500 },
  { id: 'pedi', name: 'Pedicure & Soak', price: 1800 },
  { id: 'art', name: 'Nail Art (Custom)', price: 800 },
  { id: 'soak', name: 'Soak Off / Removal', price: 500 },
];

export const TIME_SLOTS = ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];

export const formatKES = (n) => `KES ${n.toLocaleString()}`;
