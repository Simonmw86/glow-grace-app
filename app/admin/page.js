'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import emailjs from '@emailjs/browser';
import { SERVICES as DEFAULT_SERVICES, GALLERY as DEFAULT_GALLERY } from '@/lib/data';
import styles from './admin.module.css';

// Your EmailJS OTP Template ID from the dashboard
const EMAILJS_OTP_TEMPLATE_ID = 'template_5at0i2g';

async function uploadToCloudinary(file) {
  if (!file) return null;

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
  if (!res.ok) throw new Error(data.error?.message || 'Cloudinary upload failed');
  return data.secure_url;
}

export default function AdminBookingsPage() {
  // View states: 'loading', 'setup', 'login', 'forgot', 'dashboard'
  const [currentView, setCurrentView] = useState('loading');

  // Auth inputs
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Dashboard data & filters
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Time-slot blocking inputs
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('');
  const [blockReason, setBlockReason] = useState('Personal / Break');

  // Client notes inline editing
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Salon Services Management states (Supports Add & Edit/Update)
  const [servicesList, setServicesList] = useState([]);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceImageUrl, setNewServiceImageUrl] = useState('');
  const [serviceFile, setServiceFile] = useState(null);

  useEffect(() => {
    checkIfAdminExists();
  }, []);

  async function checkIfAdminExists() {
    setCurrentView('loading');
    const { count, error } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });

    if (error) console.error('Error checking admins table:', error);

    if (count === 0 || count === null) {
      setCurrentView('setup');
    } else {
      setCurrentView('login');
    }
  }

  function validatePassword(password) {
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character (e.g., !@#$%).';
    return null;
  }

  // Helper component for Eye Icon Toggle Button
  const PasswordToggleBtn = () => (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: '#666',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '4px',
      }}
      title={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      )}
    </button>
  );

  // 1. SETUP HANDLER
  async function handleSetup(e) {
    e.preventDefault();
    if (!usernameInput || !emailInput || !passwordInput) return;

    const passwordError = validatePassword(passwordInput);
    if (passwordError) {
      alert(passwordError);
      return;
    }

    setActionLoading(true);
    const { error } = await supabase
      .from('admins')
      .insert([{ username: usernameInput.trim(), email: emailInput.trim(), password: passwordInput }]);

    if (error) {
      alert('Failed to create admin account: ' + error.message);
    } else {
      alert('Admin account created securely! Please sign in.');
      setCurrentView('login');
      setUsernameInput('');
      setEmailInput('');
      setPasswordInput('');
    }
    setActionLoading(false);
  }

  // 2. LOGIN HANDLER
  async function handleLogin(e) {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return;

    setActionLoading(true);
    try {
      const { data: isValid, error } = await supabase
        .rpc('verify_admin', { input_user: usernameInput.trim(), input_pass: passwordInput });

      if (error || !isValid) {
        alert('Invalid username or password. Please try again.');
      } else {
        setCurrentView('dashboard');
        fetchBookings();
        fetchServices();
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('An error occurred during login.');
    } finally {
      setActionLoading(false);
    }
  }

  // 3A. SEND RECOVERY CODE
  async function handleSendRecoveryCode(e) {
    e.preventDefault();
    if (!emailInput) return;

    setActionLoading(true);
    try {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryDisplay = new Date(Date.now() + 15 * 60000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const { data: adminUsername, error } = await supabase.rpc('request_password_reset', {
        input_email: emailInput.trim(),
        generated_code: verificationCode,
      });

      if (error || !adminUsername) {
        alert('No admin account found associated with this email address.');
        setActionLoading(false);
        return;
      }

      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_YOUR_SERVICE_ID',
        EMAILJS_OTP_TEMPLATE_ID,
        {
          email: emailInput.trim(),
          passcode: verificationCode,
          time: expiryDisplay,
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY'
      );

      alert('Verification code sent! Check your email inbox.');
    } catch (err) {
      console.error('Recovery error:', err);
      alert('Failed to send verification email.');
    } finally {
      setActionLoading(false);
    }
  }

  // 3B. RESET PASSWORD
  async function handleResetPassword(e) {
    e.preventDefault();
    if (!emailInput || !codeInput || !newPasswordInput) return;

    const passwordError = validatePassword(newPasswordInput);
    if (passwordError) {
      alert(passwordError);
      return;
    }

    setActionLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('complete_password_reset', {
        input_email: emailInput.trim(),
        input_code: codeInput.trim(),
        new_pass: newPasswordInput,
      });

      if (error) {
        alert('Error resetting password: ' + error.message);
      } else if (result === 'INVALID_CODE') {
        alert('Invalid verification code or email address.');
      } else if (result === 'EXPIRED') {
        alert('Verification code has expired. Please request a new one.');
      } else if (result === 'SUCCESS') {
        alert('Password successfully reset! Please sign in.');
        setCurrentView('login');
        setEmailInput('');
        setCodeInput('');
        setNewPasswordInput('');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      alert('An error occurred while resetting the password.');
    } finally {
      setActionLoading(false);
    }
  }

  // --- DASHBOARD OPERATIONS ---

  async function fetchBookings() {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookings(data || []);
    }
    setLoadingBookings(false);
  }

  async function fetchServices() {
    const { data, error } = await supabase.from('services').select('*').order('name');
    if (error) console.error('Error fetching services:', error);
    else setServicesList(data || []);
  }

  // ONE-CLICK SYNC HARDCODED ITEMS TO SUPABASE
  async function handleSyncHardcodedToDb() {
    if (!window.confirm('Import your hardcoded services & gallery items into Supabase so you can edit them?')) return;

    setActionLoading(true);
    try {
      const existingNames = new Set(servicesList.map(s => s.name.trim().toLowerCase()));

      const fromServices = (DEFAULT_SERVICES || []).map(s => ({
        name: s.name.trim(),
        price: Number(s.price) || 0,
        image_url: s.image_url || s.image || s.src || ''
      }));

      const fromGallery = (DEFAULT_GALLERY || []).map(g => {
        const cleanName = (g.alt || g.label?.split('-')[0] || 'Nail Art').trim();
        const extractedPrice = Number(String(g.label || '').replace(/[^0-9]/g, '')) || 1500;
        return {
          name: cleanName,
          price: extractedPrice,
          image_url: g.src || ''
        };
      });

      const combined = [...fromServices, ...fromGallery].filter(item => {
        const key = item.name.toLowerCase();
        if (existingNames.has(key)) return false;
        existingNames.add(key);
        return true;
      });

      if (combined.length === 0) {
        alert('All hardcoded items are already in your database!');
        setActionLoading(false);
        return;
      }

      const { error } = await supabase.from('services').insert(combined);
      if (error) throw error;

      alert(`Successfully imported ${combined.length} items! You can now edit or update their images below. ✨`);
      fetchServices();
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // --- SERVICE EDIT & UPDATE FUNCTIONS ---
  function handleStartEditService(service) {
    setEditingServiceId(service.id);
    setNewServiceName(service.name || '');
    setNewServicePrice(service.price || '');
    setNewServiceImageUrl(service.image_url || service.image || service.imageUrl || '');
    setServiceFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEditService() {
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceImageUrl('');
    setServiceFile(null);
  }

  async function handleSaveService(e) {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) return;

    setActionLoading(true);
    try {
      let uploadedUrl = newServiceImageUrl.trim();
      if (serviceFile) {
        const cloudUrl = await uploadToCloudinary(serviceFile);
        if (cloudUrl) uploadedUrl = cloudUrl;
      }

      if (editingServiceId) {
        const updatePayload = {
          name: newServiceName.trim(),
          price: parseFloat(newServicePrice),
        };
        if (uploadedUrl) {
          updatePayload.image_url = uploadedUrl;
        }

        const { error } = await supabase
          .from('services')
          .update(updatePayload)
          .eq('id', editingServiceId);

        if (error) throw error;
        alert(`Service "${newServiceName}" updated successfully! ✨`);
      } else {
        const { error } = await supabase.from('services').insert([
          { 
            name: newServiceName.trim(), 
            price: parseFloat(newServicePrice),
            image_url: uploadedUrl || ''
          }
        ]);

        if (error) throw error;
        alert(`Service "${newServiceName}" added successfully! ✨`);
      }

      handleCancelEditService();
      fetchServices();
    } catch (err) {
      alert('Failed to save service: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteService(id, serviceName) {
    if (!window.confirm(`Are you sure you want to delete "${serviceName}"?`)) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      alert('Failed to delete service: ' + error.message);
    } else {
      fetchServices();
    }
  }

  async function handleStatusChange(id, newStatus) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      fetchBookings();
    }
  }

  async function handleSaveNote(id) {
    const { error } = await supabase
      .from('bookings')
      .update({ admin_notes: noteDraft })
      .eq('id', id);

    if (error) {
      alert('Failed to save note: ' + error.message);
    } else {
      setEditingNoteId(null);
      setNoteDraft('');
      fetchBookings();
    }
  }

  async function handleBlockSlot(e) {
    e.preventDefault();
    if (!blockDate || !blockTime) return;

    const { error } = await supabase.from('bookings').insert([
      {
        full_name: `BLOCKED (${blockReason})`,
        phone: 'N/A',
        booking_date: blockDate,
        booking_time: blockTime,
        services: 'Unavailable / Blocked Slot',
        total_price: '0',
        status: 'Blocked',
        admin_notes: blockReason,
      },
    ]);

    if (error) {
      alert('Failed to block time slot: ' + error.message);
    } else {
      alert(`Blocked ${blockDate} at ${blockTime}.`);
      setBlockDate('');
      setBlockTime('');
      fetchBookings();
    }
  }

  async function handleCancel(id, clientName, date, time) {
    const confirmDelete = window.confirm(
      `Remove "${clientName}" on ${date} at ${time}? This will free up the time slot.`
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) {
      alert('Failed to delete booking: ' + error.message);
    } else {
      fetchBookings();
    }
  }

  function handleExportCSV() {
    if (bookings.length === 0) return;

    const headers = ['Client Name', 'Phone', 'Date', 'Time', 'Services', 'Total Price', 'Status', 'Notes'];
    const rows = bookings.map((b) => [
      `"${b.full_name}"`,
      `"${b.phone}"`,
      `"${b.booking_date}"`,
      `"${b.booking_time}"`,
      `"${(b.services || '').replace(/"/g, '""')}"`,
      `"${b.total_price}"`,
      `"${b.status || 'Confirmed'}"`,
      `"${(b.admin_notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `glow_grace_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const activeClients = bookings.filter((b) => b.status !== 'Blocked');
  const completedCount = activeClients.filter((b) => b.status === 'Completed').length;
  const totalRevenue = activeClients
    .filter((b) => b.status !== 'No-Show')
    .reduce((sum, b) => {
      const numericPrice = parseFloat(String(b.total_price || '0').replace(/[^0-9.]/g, ''));
      return sum + (isNaN(numericPrice) ? 0 : numericPrice);
    }, 0);

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = statusFilter === 'All' || (b.status || 'Confirmed') === statusFilter;
    const name = (b.full_name || '').toLowerCase();
    const phone = (b.phone || '').toLowerCase();
    const query = activeSearchQuery.toLowerCase().trim();
    const matchesSearch = name.includes(query) || phone.includes(query);
    return matchesStatus && matchesSearch;
  });

  // --- AUTH VIEWS ---

  if (currentView === 'loading') {
    return (
      <main className={styles.authContainer}>
        <p className={styles.statusText}>Checking system configuration...</p>
      </main>
    );
  }

  if (currentView === 'setup') {
    return (
      <main className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>Create Admin Account</h1>
          <p className={styles.authSubtitle}>Set up your secure login &amp; recovery credentials.</p>
          <div style={{ textAlign: 'left', fontSize: '0.8rem', color: '#666', background: '#fff5f7', padding: '10px', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #fce4ec' }}>
            <strong>Password Requirements:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>At least 8 characters long</li>
              <li>At least one uppercase &amp; lowercase letter</li>
              <li>At least one number &amp; special character</li>
            </ul>
          </div>
          <form onSubmit={handleSetup} className={styles.authForm}>
            <input type="text" placeholder="Choose Admin Username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className={styles.input} autoComplete="username" required />
            <input type="email" placeholder="Admin Recovery Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className={styles.input} autoComplete="email" required />
            <div style={{ position: 'relative', width: '100%' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="Choose Strong Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={styles.input} style={{ paddingRight: '45px', width: '100%', boxSizing: 'border-box' }} autoComplete="new-password" required />
              <PasswordToggleBtn />
            </div>
            <button type="submit" className={styles.primaryButton} disabled={actionLoading}>
              {actionLoading ? 'Creating Account...' : 'Create & Save Account'}
            </button>
          </form>
          <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>Already have an account? </span>
            <button onClick={() => setCurrentView('login')} style={{ background: 'none', border: 'none', color: '#d81b60', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Sign In</button>
          </div>
        </div>
      </main>
    );
  }

  if (currentView === 'forgot') {
    return (
      <main className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>Reset Password</h1>
          <p className={styles.authSubtitle}>Recover access to your admin account.</p>
          <form onSubmit={handleSendRecoveryCode} className={styles.authForm} style={{ marginBottom: '1rem' }}>
            <input 
              type="email" 
              placeholder="Enter your admin email" 
              value={emailInput} 
              onChange={(e) => setEmailInput(e.target.value)} 
              className={styles.input} 
              autoComplete="email"
              required 
            />
            <button type="submit" className={styles.secondaryButton} disabled={actionLoading}>
              {actionLoading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '1rem 0' }} />
          <form onSubmit={handleResetPassword} className={styles.authForm}>
            <input 
              type="text" 
              placeholder="Enter 6-digit Code" 
              value={codeInput} 
              onChange={(e) => setCodeInput(e.target.value)} 
              className={styles.input} 
              autoComplete="one-time-code"
              required 
            />
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter New Strong Password" 
                value={newPasswordInput} 
                onChange={(e) => setNewPasswordInput(e.target.value)} 
                className={styles.input} 
                style={{ paddingRight: '45px', width: '100%', boxSizing: 'border-box' }} 
                autoComplete="new-password"
                required 
              />
              <PasswordToggleBtn />
            </div>
            <button type="submit" className={styles.primaryButton} disabled={actionLoading}>
              {actionLoading ? 'Resetting...' : 'Verify & Update Password'}
            </button>
          </form>
          <button onClick={() => { setCurrentView('login'); setEmailInput(''); }} style={{ background: 'none', border: 'none', color: '#666', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            &larr; Back to Sign In
          </button>
        </div>
      </main>
    );
  }

  if (currentView === 'login') {
    return (
      <main className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>Glow &amp; Grace Admin</h1>
          <p className={styles.authSubtitle}>Sign in with your database credentials.</p>
          <form onSubmit={handleLogin} className={styles.authForm}>
            <input type="text" placeholder="Admin Username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className={styles.input} autoComplete="username" required />
            <div style={{ position: 'relative', width: '100%' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="Admin Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={styles.input} style={{ paddingRight: '45px', width: '100%', boxSizing: 'border-box' }} autoComplete="current-password" required />
              <PasswordToggleBtn />
            </div>
            <button type="submit" className={styles.primaryButton} disabled={actionLoading}>
              {actionLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2rem', width: '100%' }}>
            <button onClick={() => setCurrentView('forgot')} style={{ background: 'none', border: 'none', color: '#d81b60', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Forgot Password?</button>
            <button onClick={() => setCurrentView('setup')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem' }}>Create Account</button>
          </div>
        </div>
      </main>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <main className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Glow &amp; Grace Admin</h1>
          <p className={styles.subtitle}>Manage appointments, track revenue, block slots, and keep client notes.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportCSV} className={styles.secondaryButton}>
            Export CSV
          </button>
          <button
            onClick={() => {
              setCurrentView('login');
              setUsernameInput('');
              setPasswordInput('');
              setShowPassword(false);
            }}
            className={styles.secondaryButton}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #fce4ec', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Client Bookings</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111', marginTop: '4px' }}>{activeClients.length}</div>
        </div>
        <div style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #fce4ec', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Completed Appointments</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32', marginTop: '4px' }}>{completedCount}</div>
        </div>
        <div style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #fce4ec', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Projected / Earned Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d81b60', marginTop: '4px' }}>
            KES {totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Salon Services Management Panel (Supports Add, Edit/Update, Sync Hardcoded, and Delete) */}
      <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '10px', border: '1px solid #fce4ec', marginBottom: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ fontSize: '1rem', color: '#880e4f' }}>
            {editingServiceId ? '✏️ Edit Existing Service / Gallery Item' : '➕ Add New Salon Service & Pricing'}
          </strong>
          <button
            type="button"
            onClick={handleSyncHardcodedToDb}
            disabled={actionLoading}
            style={{
              background: '#fce4ec',
              color: '#880e4f',
              border: '1px solid #f8bbd0',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Sync Hardcoded Items to DB
          </button>
        </div>

        <form onSubmit={handleSaveService} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Service Name (e.g., Pedicure & Scrub)"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            className={styles.input}
            style={{ flex: '2', minWidth: '180px', margin: 0 }}
            required
          />
          <input
            type="number"
            placeholder="Price in KES (e.g., 2000)"
            value={newServicePrice}
            onChange={(e) => setNewServicePrice(e.target.value)}
            className={styles.input}
            style={{ flex: '1', minWidth: '120px', margin: 0 }}
            required
          />
          <input
            type="url"
            placeholder="Image URL link (optional)"
            value={newServiceImageUrl}
            onChange={(e) => setNewServiceImageUrl(e.target.value)}
            className={styles.input}
            style={{ flex: '2', minWidth: '180px', margin: 0 }}
          />
          <div style={{ flex: '2', minWidth: '180px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>Or upload file:</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setServiceFile(e.target.files?.[0] || null)}
              style={{ fontSize: '0.8rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button type="submit" className={styles.primaryButton} style={{ width: 'auto', margin: 0 }} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingServiceId ? 'Update Service in Database' : 'Add Service'}
            </button>
            {editingServiceId && (
              <button
                type="button"
                onClick={handleCancelEditService}
                className={styles.secondaryButton}
                style={{ width: 'auto', margin: 0 }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {servicesList.map((s) => {
            const img = s.image_url || s.image || s.imageUrl;
            return (
              <div key={s.id} style={{ background: '#fff5f7', border: '1px solid #fce4ec', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                {img ? (
                  <img src={img} alt={s.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                ) : (
                  <div style={{ width: '40px', height: '40px', background: '#fce4ec', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#d81b60', textAlign: 'center' }}>No Photo</div>
                )}
                <div style={{ minWidth: '120px' }}>
                  <strong style={{ display: 'block', color: '#111' }}>{s.name}</strong>
                  <div style={{ color: '#d81b60', fontWeight: 'bold' }}>KES {Number(s.price).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                  <button 
                    type="button" 
                    onClick={() => handleStartEditService(s)}
                    style={{ 
                      background: '#e8f5e9', 
                      border: '1px solid #c8e6c9', 
                      color: '#2e7d32', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '0.75rem', 
                      padding: '5px 8px', 
                      borderRadius: '6px'
                    }}
                  >
                    Edit / Change
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteService(s.id, s.name)}
                    style={{ 
                      background: '#ffebee', 
                      border: '1px solid #ffcdd2', 
                      color: '#c62828', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '0.75rem', 
                      padding: '5px 8px', 
                      borderRadius: '6px'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Time-Slot Blocker */}
      <div style={{ background: '#fff5f7', padding: '1rem', borderRadius: '10px', border: '1px solid #fce4ec', marginBottom: '1.5rem' }}>
        <strong style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#880e4f' }}>
          Block Off Unavailable Time Slot
        </strong>
        <form onSubmit={handleBlockSlot} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className={styles.input}
            style={{ width: 'auto', margin: 0 }}
            required
          />
          <input
            type="time"
            value={blockTime}
            onChange={(e) => setBlockTime(e.target.value)}
            className={styles.input}
            style={{ width: 'auto', margin: 0 }}
            required
          />
          <input
            type="text"
            placeholder="Reason (e.g., Lunch, Day Off)"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className={styles.input}
            style={{ flex: '1', minWidth: '160px', margin: 0 }}
          />
          <button type="submit" className={styles.primaryButton} style={{ width: 'auto', margin: 0 }}>
            Block Slot
          </button>
        </form>
      </div>

      {/* Search & Status Filter Bar with Search Button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flex: '1', minWidth: '240px', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search client name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setActiveSearchQuery(searchQuery);
              }
            }}
            className={styles.input}
            style={{ flex: '1', margin: 0 }}
          />
          <button
            type="button"
            onClick={() => setActiveSearchQuery(searchQuery)}
            className={styles.primaryButton}
            style={{ width: 'auto', margin: 0, padding: '0 16px', whiteSpace: 'nowrap' }}
          >
            Search
          </button>
          {activeSearchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveSearchQuery('');
              }}
              className={styles.secondaryButton}
              style={{ width: 'auto', margin: 0, padding: '0 12px' }}
              title="Clear search"
            >
              Clear
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.input}
          style={{ width: 'auto', margin: 0 }}
        >
          <option value="All">All Statuses</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="No-Show">No-Show</option>
          <option value="Blocked">Blocked Slots</option>
        </select>
      </div>

      {/* Bookings Table */}
      {loadingBookings ? (
        <p className={styles.statusText}>Loading appointments...</p>
      ) : filteredBookings.length === 0 ? (
        <div className={styles.emptyCard}>
          <p>No matching bookings found.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Date &amp; Time</th>
                <th className={styles.th}>Services &amp; Total</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Client Notes</th>
                <th className={styles.th}>Inspiration</th>
                <th className={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const isBlocked = b.status === 'Blocked';
                return (
                  <tr
                    key={b.id}
                    className={styles.tableRow}
                    style={{ background: isBlocked ? '#f9f9f9' : 'transparent' }}
                  >
                    <td className={styles.td}>
                      <strong>{b.full_name}</strong>
                      {!isBlocked && <div style={{ fontSize: '0.82rem', color: '#666' }}>{b.phone}</div>}
                    </td>

                    <td className={styles.td}>
                      {b.booking_date} <br />
                      <span style={{ color: '#d81b60', fontWeight: 'bold' }}>{b.booking_time}</span>
                    </td>

                    <td className={styles.td}>
                      <div style={{ fontSize: '0.9rem', color: '#333' }}>{b.services}</div>
                      {!isBlocked && (
                        <div style={{ fontWeight: 'bold', marginTop: '4px', color: '#111' }}>
                          {b.total_price}
                        </div>
                      )}
                    </td>

                    {/* Status Cell */}
                    <td className={styles.td}>
                      <select
                        value={b.status || 'Confirmed'}
                        onChange={(e) => handleStatusChange(b.id, e.target.value)}
                        className={styles.input}
                        style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto', margin: 0 }}
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="No-Show">No-Show</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </td>

                    {/* Client Notes Cell */}
                    <td className={styles.td}>
                      {editingNoteId === b.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            className={styles.input}
                            style={{ width: '160px', height: '60px', fontSize: '0.82rem', margin: 0 }}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleSaveNote(b.id)} className={styles.primaryButton} style={{ padding: '2px 8px', fontSize: '0.75rem', width: 'auto', margin: 0 }}>Save</button>
                            <button onClick={() => setEditingNoteId(null)} className={styles.secondaryButton} style={{ padding: '2px 8px', fontSize: '0.75rem', width: 'auto', margin: 0 }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: b.admin_notes ? '#333' : '#999', maxWidth: '150px', wordBreak: 'break-word' }}>
                            {b.admin_notes || 'No notes'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingNoteId(b.id);
                              setNoteDraft(b.admin_notes || '');
                            }}
                            style={{ background: 'none', border: 'none', color: '#d81b60', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Inspiration Image Cell */}
                    <td className={styles.td}>
                      {b.image_url && b.image_url.startsWith('http') ? (
                        <a href={b.image_url} target="_blank" rel="noopener noreferrer" style={{ color: '#d81b60', textDecoration: 'underline', fontSize: '0.85rem' }}>
                          View Photo
                        </a>
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.85rem' }}>None</span>
                      )}
                    </td>

                    {/* Action Cell */}
                    <td className={styles.td}>
                      <button
                        onClick={() => handleCancel(b.id, b.full_name, b.booking_date, b.booking_time)}
                        style={{
                          background: '#ffebee',
                          color: '#c62828',
                          border: '1px solid #ffcdd2',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.78rem',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}