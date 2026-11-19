'use client';

import { useEffect, useMemo, useState } from 'react';
import emailjs from '@emailjs/browser';
import { SERVICES as DEFAULT_SERVICES, TIME_SLOTS, formatKES } from '@/lib/data';
import { supabase } from '@/lib/supabase';

async function uploadToCloudinary(file) {
  if (!file) return 'No reference image attached';

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !preset) {
    throw new Error('Cloudinary environment variables are missing.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }

  return data.secure_url;
}

export default function BookingForm() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState([]); // Array of service IDs
  const [availableServices, setAvailableServices] = useState(DEFAULT_SERVICES); // Initialized with defaults
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]); // Taken times from database
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState(null);

  // Fetch live services from Supabase and merge them intelligently with defaults
  useEffect(() => {
    async function fetchServices() {
      const { data, error } = await supabase.from('services').select('*').order('name');

      if (!error && data && data.length > 0) {
        const normalizedSupabaseServices = data.map(s => ({
          ...s,
          image_url: s.image_url || s.image || s.imageUrl || ''
        }));

        const dbMap = new Map(
          normalizedSupabaseServices.map(s => [s.name.trim().toLowerCase(), s])
        );

        const merged = DEFAULT_SERVICES.map(def => {
          const key = def.name.trim().toLowerCase();
          if (dbMap.has(key)) {
            const match = dbMap.get(key);
            dbMap.delete(key);
            return match;
          }
          return def;
        });

        const extraSupabaseServices = Array.from(dbMap.values());
        setAvailableServices([...merged, ...extraSupabaseServices]);
      } else {
        setAvailableServices(DEFAULT_SERVICES);
      }
    }
    fetchServices();
  }, []);

  const chosen = useMemo(() => {
    return availableServices.filter((s) => selected.includes(s.id));
  }, [selected, availableServices]);

  const total = useMemo(() => {
    return chosen.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }, [chosen]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!date) {
      setBookedSlots([]);
      return;
    }

    async function fetchBookedTimes() {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('booking_date', date);

      if (!error && data) {
        setBookedSlots(data.map((item) => item.booking_time));
      }
    }

    fetchBookedTimes();
  }, [date]);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const toggleService = (id) => {
    setSelected((prev) => {
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setSelected([]);
    setFile(null);
    setDate('');
    setTime('');
    setBookedSlots([]);
  };

  const closeModal = () => {
    setModal(null);
    resetForm();
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (chosen.length === 0) {
      alert('Please select at least one service before confirming your appointment.');
      return;
    }

    const phoneRegex = /^(?:\+?254|0)?([17]\d{8})$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      alert('Please enter a valid Kenyan phone number (e.g., 0712 345 678).');
      return;
    }

    setSubmitting(true);

    let imageUrl;
    try {
      imageUrl = await uploadToCloudinary(file);
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr);
      alert(`Image upload failed: ${uploadErr.message}`);
      setSubmitting(false);
      return;
    }

    const servicesText = chosen.map((s) => `${s.name} (${formatKES(s.price)})`);

    const { error: dbError } = await supabase.from('bookings').insert([
      {
        full_name: fullName.trim(),
        phone: phone.trim(),
        booking_date: date,
        booking_time: time,
        services: servicesText.join(', '),
        total_price: formatKES(total),
        image_url: imageUrl,
      },
    ]);

    if (dbError) {
      setSubmitting(false);
      if (dbError.code === '23505') {
        alert('⚠️ Sorry, this time slot was just booked by someone else! Please pick another time.');
        const { data } = await supabase
          .from('bookings')
          .select('booking_time')
          .eq('booking_date', date);
        if (data) setBookedSlots(data.map((item) => item.booking_time));
        setTime('');
      } else {
        alert('Database error: ' + dbError.message);
      }
      return;
    }

    const details = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      date,
      time,
      services: servicesText,
      total: formatKES(total),
      imageUrl,
    };

    const templateParams = {
      client_name: details.fullName,
      client_phone: details.phone,
      service_list: servicesText.join(', '),
      booking_date: date,
      booking_time: time,
      total_price: details.total,
      reference_image: imageUrl,
    };

    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        templateParams,
        { publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY }
      );
    } catch (err) {
      console.error('EmailJS failed:', err);
      alert('Booking saved to database, but email dispatch failed. Please contact Joseph directly.');
    } finally {
      setSubmitting(false);
      setModal(details);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <fieldset className="form-section">
          <legend>Client Information</legend>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>2. Choose Services</legend>
          {/* Services Selection Grid without Images */}
          <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
            {availableServices.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', gridColumn: '1 / -1' }}>Loading available services...</p>
            ) : (
              availableServices.map((s) => {
                const isChecked = selected.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className={`services-card ${isChecked ? 'selected' : ''}`}
                    onClick={() => toggleService(s.id)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: '#fff',
                      borderRadius: '10px',
                      padding: '15px',
                      border: isChecked ? '2px solid var(--primary-color, #d63384)' : '1px solid #eaeaea',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div className="card-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="title" style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#222' }}>{s.name}</span>
                      <span className="price" style={{ color: 'var(--primary-color, #d63384)', fontWeight: '600', fontSize: '0.9rem' }}>
                        {formatKES(s.price)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>3. Inspiration / Reference Image (Optional)</legend>
          <div className="input-group">
            <label htmlFor="referenceImage">Upload an inspiration photo of the design you want</label>
            <input
              id="referenceImage"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          {preview && (
            <div className="preview-container">
              <p className="preview-label">Selected Preview:</p>
              <img src={preview} alt="Nail Reference Preview" />
            </div>
          )}
        </fieldset>

        <fieldset className="form-section">
          <legend>4. Date &amp; Time Selection</legend>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="bookingDate">Preferred Date</label>
              <input
                id="bookingDate"
                type="date"
                required
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="bookingTime">Time Slot</label>
              <select
                id="bookingTime"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                <option value="">Select a time slot</option>
                {TIME_SLOTS.map((t) => {
                  const isBooked = bookedSlots.includes(t);
                  return (
                    <option key={t} value={t} disabled={isBooked}>
                      {t} {isBooked ? '(Booked)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="total-bar">
          <span>Total Estimated Price:</span>
          <strong>{formatKES(total)}</strong>
        </div>

        <button type="submit" className="btn-submit" disabled={submitting}>
          {submitting ? 'Processing & Uploading...' : 'Confirm Appointment'}
        </button>
      </form>

      {modal && (
        <div
          className="modal"
          style={{ display: 'flex' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-content">
            <h2>Booking Request Dispatched ✨</h2>
            <hr />
            <div>
              <p><strong>Client:</strong> {modal.fullName}</p>
              <p><strong>Phone:</strong> {modal.phone}</p>
              <p><strong>Date &amp; Time:</strong> {modal.date} at {modal.time}</p>
              <p><strong>Services:</strong></p>
              <ul style={{ listStyle: 'disc', paddingLeft: 20, textAlign: 'left', margin: '0.5rem 0' }}>
                {modal.services.map((svc) => (
                  <li key={svc}>{svc}</li>
                ))}
              </ul>
              <p><strong>Total Estimated:</strong> {modal.total}</p>
              {modal.imageUrl && modal.imageUrl.startsWith('http') && (
                <p>
                  <strong>Inspiration Image:</strong>{' '}
                  <a
                    href={modal.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}
                  >
                    View Uploaded Photo
                  </a>
                </p>
              )}
            </div>

            {/* Direct WhatsApp Action Button */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
              <a
                href={`https://wa.me/254704954127?text=${encodeURIComponent(
                  `*New Booking Request - Glow & Grace Nails* ✨\n\n` +
                  `👤 *Client:* ${modal.fullName}\n` +
                  `📞 *Phone:* ${modal.phone}\n` +
                  `📅 *Date:* ${modal.date} at ${modal.time}\n` +
                  `💅 *Services:* ${modal.services.join(', ')}\n` +
                  `💰 *Total:* ${modal.total}\n` +
                  `${modal.imageUrl && modal.imageUrl.startsWith('http') ? `🖼️ *Reference Image:* ${modal.imageUrl}` : ''}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  background: '#25D366',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                }}
              >
                Open WhatsApp Chat
              </a>
              <button onClick={closeModal} className="btn-close" style={{ flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}