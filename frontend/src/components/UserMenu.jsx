import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

export default function UserMenu() {
  const { user, logout, login: updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [locCoordinates, setLocCoordinates] = useState(null);
  const menuRef = useRef(null);

  const [providerProfile, setProviderProfile] = useState(null);

  // Fetch user profile and optionally provider profile
  useEffect(() => {
    api.get('/auth/me')
      .then(r => {
        setUserProfile(r.data);
        setPhone(r.data.phone || '');
        setAddress(r.data.address || '');
        if (r.data.role === 'provider') {
          api.get('/providers/me')
            .then(res => setProviderProfile(res.data))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setEditingPhone(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSavePhone = async () => {
    setSavingPhone(true);
    try {
      const { data } = await api.patch('/auth/me', { phone });
      setUserProfile(data);
      setEditingPhone(false);
    } catch {}
    setSavingPhone(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setLocCoordinates(coords);
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`);
          const data = await resp.json();
          if (data && data.address) {
            const road = data.address.road || data.address.street || data.address.pedestrian;
            const suburb = data.address.suburb || data.address.neighbourhood || data.address.quarter;
            const cityOrTown = data.address.city || data.address.town || data.address.municipality || data.address.county || data.address.village || data.address.hamlet || data.address.state;
            const parts = [road, suburb, cityOrTown].filter(Boolean);
            setAddress(parts.join(', ') || data.display_name);
          } else {
            setAddress(data.display_name || `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
          }
        } catch {
          setAddress(`${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
        }
        setDetectingLoc(false);
      },
      () => {
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveAddress = async () => {
    setSavingAddress(true);
    try {
      const payload = { address };
      if (locCoordinates) payload.coordinates = locCoordinates;
      const { data } = await api.patch('/auth/me', payload);
      setUserProfile(data);
      setEditingAddress(false);
      if (user?.role === 'provider') {
        setProviderProfile(prev => prev ? { ...prev, city: address, location: data.location } : null);
      }
    } catch {}
    setSavingAddress(false);
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-105 ring-2 ring-transparent hover:ring-indigo-500/30"
        aria-label="User menu"
      >
        {initials}
        {/* Online indicator */}
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0a0a0f]" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50 animate-in">
          {/* User header */}
          <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-white truncate">{user?.name}</div>
                <div className="text-xs text-white/40 truncate">{user?.email}</div>
                <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Phone section */}
          <div className="px-5 py-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Phone / WhatsApp</span>
              {!editingPhone && (
                <button
                  onClick={() => setEditingPhone(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {userProfile?.phone ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {editingPhone ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                  autoFocus
                />
                <button
                  onClick={handleSavePhone}
                  disabled={savingPhone}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {savingPhone ? '...' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="mt-1 text-sm text-white/70">
                {userProfile?.phone ? (
                  <span className="flex items-center gap-1.5">
                    📞 {userProfile.phone}
                  </span>
                ) : (
                  <span className="text-white/30 italic text-xs">No phone set — add one so providers can contact you</span>
                )}
              </div>
            )}
            <p className="text-[10px] text-white/20 mt-1.5">🔒 Only shared after a booking is accepted</p>
          </div>

          {/* Address section */}
          <div className="px-5 py-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Location / Address</span>
              {!editingAddress && (
                <button
                  onClick={() => setEditingAddress(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {userProfile?.address ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {editingAddress ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter location or address..."
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveAddress}
                    disabled={savingAddress || detectingLoc}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                  >
                    {savingAddress ? '...' : 'Save'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detectingLoc}
                  className="w-full bg-white/5 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-[10px] py-1.5 rounded-lg text-white/60 hover:text-white transition-all disabled:opacity-40"
                >
                  {detectingLoc ? '📡 Detecting...' : '📡 Use GPS Coordinates'}
                </button>
              </div>
            ) : (
              <div className="mt-1 text-sm text-white/70">
                {userProfile?.address ? (
                  <div>
                    <span className="flex items-center gap-1.5">
                      📍 {userProfile.address}
                    </span>
                    {userProfile.location?.coordinates && userProfile.location.coordinates[0] !== 0 && (
                      <p className="text-[10px] text-white/40 mt-1">
                        GPS: {userProfile.location.coordinates[1].toFixed(5)}, {userProfile.location.coordinates[0].toFixed(5)}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-white/30 italic text-xs">No address set — add one to let providers know where you are</span>
                )}
              </div>
            )}
          </div>

          {/* Provider Profile Details */}
          {providerProfile && (
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium block mb-2">Profile Details</span>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Specialty</span>
                  <span className="text-white font-medium text-right max-w-[120px] truncate">{providerProfile.specialty || providerProfile.jobFamily || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Work Mode</span>
                  <span className="text-white font-medium capitalize">
                    {providerProfile.workMode === 'both' ? 'Remote & In-person' : providerProfile.workMode || 'In-person'}
                  </span>
                </div>
                {providerProfile.city && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Location</span>
                    <span className="text-white font-medium">{providerProfile.city}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/60">Rate</span>
                  <span className="text-white font-medium">
                    {providerProfile.hourlyRate ? `${providerProfile.hourlyRate} ${providerProfile.currency}/hr` : 'Not set'}
                  </span>
                </div>
                {providerProfile.cvPath && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-white/60">CV</span>
                    <a
                      href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${providerProfile.cvPath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                      📄 View CV
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Menu items */}
          <div className="py-1.5">
            {user?.role === 'provider' && (
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Profile
              </Link>
            )}

            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Dashboard
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                Admin Panel
              </Link>
            )}

            {user?.role === 'client' && (
              <Link
                to="/chat"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                AI Assistant
              </Link>
            )}
          </div>

          {/* Appearance / theme toggle */}
          <div className="border-t border-white/5 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none">{theme === 'dark' ? '🌙' : '☀️'}</span>
                <div>
                  <div className="text-xs font-semibold text-white/70">Appearance</div>
                  <div className="text-[10px] text-white/40 capitalize">{theme} mode</div>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className={`relative w-11 h-6 rounded-full border transition-colors ${
                  theme === 'dark'
                    ? 'bg-indigo-600/80 border-indigo-500/60'
                    : 'bg-white/15 border-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-white/5 py-1.5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-5 py-2.5 text-sm text-red-400/70 hover:text-red-300 hover:bg-red-500/[0.04] transition-all w-full text-left"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
