'use client';

import { useEffect, useMemo, useState } from 'react';
import emailjs from '@emailjs/browser';
import { SERVICES, TIME_SLOTS, formatKES } from '@/lib/data';

async function uploadToCloudinary(file) {
  if (!file) return 'No reference image attached';

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.secure_url || 'Upload failed';
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    return 'Image upload failed';
  }
}

export default function BookingForm() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState([]); // Array of service ids
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState(null);

  // Filter selected services and compute total
  const chosen = useMemo(() => {
    return SERVICES.filter((s) => selected.includes(s.id));
  }, [selected]);

  const total = useMemo(() => {
    return chosen.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }, [chosen]);

  const today = new Date().toISOString().split('T')[0];

  // Preview URL lifecycle
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

    // Validate Phone Number (Kenyan format check)
    const phoneRegex = /^(?:\+?254|0)?([17]\d{8})$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      alert('Please enter a valid Kenyan phone number (e.g., 0712 345 678).');
      return;
    }

    setSubmitting(true);

    const imageUrl = await uploadToCloudinary(file);
    const servicesText = chosen.map((s) => `${s.name} (${formatKES(s.price)})`);

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
      // 1. Send Email via EmailJS
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        templateParams,
        { publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY }
      );
    } catch (err) {
      console.error('EmailJS failed:', err);
      alert('Booking recorded, but email dispatch failed. Please contact Joseph directly.');
    } finally {
      setSubmitting(false);
      setModal(details);

      // 2. Trigger WhatsApp Dispatch automatically
      const whatsappMessage = encodeURIComponent(
        `*New Booking Request - Glow & Grace Nails* ✨\n\n` +
        `👤 *Client:* ${details.fullName}\n` +
        `📞 *Phone:* ${details.phone}\n` +
        `📅 *Date:* ${details.date} at ${details.time}\n` +
        `💅 *Services:* ${servicesText.join(', ')}\n` +
        `💰 *Total:* ${details.total}\n` +
        `${imageUrl.startsWith('http') ? `🖼️ *Reference Image:* ${imageUrl}` : ''}`
      );

      const businessWhatsAppNumber = '254704954127'; // Replace with your active business WhatsApp number
      window.open(`https://wa.me/${businessWhatsAppNumber}?text=${whatsappMessage}`, '_blank');
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
          <div className="services-grid">
            {SERVICES.map((s) => {
              const isChecked = selected.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`services-card ${isChecked ? 'selected' : ''}`}
                  onClick={() => toggleService(s.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Handled by parent div click
                  />
                  <div className="card-content">
                    <span className="title">{s.name}</span>
                    <span className="price">{formatKES(s.price)}</span>
                  </div>
                </div>
              );
            })}
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
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
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
              {modal.imageUrl.startsWith('http') && (
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
            <button onClick={closeModal} className="btn-close">Close</button>
          </div>
        </div>
      )}
    </>
  );
}