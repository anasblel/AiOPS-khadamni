import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import ProfileViewModal from '../components/ProfileViewModal';
import Navbar from '../components/Navbar';

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function ProviderCard({ provider, onBook, onViewProfile }) {
  return (
    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 mt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-white">{provider.name}</div>
          <div className="text-xs text-white/50 mt-0.5">
            {provider.specialty && <span className="text-indigo-300">{provider.specialty}</span>}
            {provider.specialty && ' · '}
            {provider.workMode === 'both' ? '🌎 Remote & In-person' : provider.workMode === 'remote' ? '💻 Remote' : '📍 In-person'}
            {provider.city && ` · ${provider.city}`}
            {' · '}{provider.hourlyRate} {provider.currency}/hr
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {provider.skills?.map(s => (
              <span key={s} className="text-xs bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-white/60">{s}</span>
            ))}
          </div>
          {/* Availability preview */}
          {provider.availability?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {provider.availability
                .slice()
                .sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day))
                .slice(0, 4)
                .map(a => (
                  <span key={a.day} className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-1.5 py-0.5 rounded capitalize">
                    {a.day.slice(0, 3)} {a.slots?.[0]?.start}–{a.slots?.[0]?.end}
                  </span>
                ))}
              {provider.availability.length > 4 && (
                <span className="text-[10px] text-white/30">+{provider.availability.length - 4} more</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => onViewProfile(provider)}
            className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-medium px-3 py-2 rounded-lg text-white/60 hover:text-white"
          >
            View Profile
          </button>
          <button
            onClick={() => onBook(provider)}
            className="bg-indigo-600 hover:bg-indigo-500 transition-colors text-xs font-semibold px-3 py-2 rounded-lg"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingModal({ provider, onClose, onConfirm }) {
  const [form, setForm] = useState({ skill: provider.skills?.[0] || '', date: '', timeFrom: '', budget: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientLocation, setClientLocation] = useState(null);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [locAddress, setLocAddress] = useState('');
  const overlayRef = useRef(null);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Detect client location
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setClientLocation(coords);
        // Reverse geocode for address
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`);
          const data = await resp.json();
          if (data && data.address) {
            const road = data.address.road || data.address.street || data.address.pedestrian;
            const suburb = data.address.suburb || data.address.neighbourhood || data.address.quarter;
            const cityOrTown = data.address.city || data.address.town || data.address.municipality || data.address.county || data.address.village || data.address.hamlet || data.address.state;
            const parts = [road, suburb, cityOrTown].filter(Boolean);
            setLocAddress(parts.join(', ') || data.display_name);
          } else {
            setLocAddress(data.display_name || `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
          }
        } catch {
          setLocAddress(`${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
        }
        setDetectingLoc(false);
      },
      (err) => {
        setError('Location access denied. You can still book without sharing location.');
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Check if selected date/time fits provider availability
  const getAvailabilityMatch = () => {
    if (!form.date || !provider.availability?.length) return null;
    const dateObj = new Date(form.date + 'T12:00:00');
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayAvail = provider.availability.find(a => a.day === dayName);
    if (!dayAvail) return { match: false, message: `Provider is not available on ${dayName}s` };
    if (form.timeFrom && dayAvail.slots?.length > 0) {
      const inSlot = dayAvail.slots.some(s => form.timeFrom >= s.start && form.timeFrom <= s.end);
      if (!inSlot) return { match: false, message: `Time ${form.timeFrom} is outside provider's slots (${dayAvail.slots.map(s => s.start + '–' + s.end).join(', ')})` };
    }
    return { match: true, message: `✅ Provider is available on ${dayName} (${dayAvail.slots.map(s => s.start + '–' + s.end).join(', ')})` };
  };

  const availMatch = getAvailabilityMatch();

  const handleConfirm = async () => {
    if (!form.date || !form.timeFrom) { setError('Please fill in date and time.'); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm({
        ...form,
        budget: Number(form.budget),
        clientLocation: clientLocation ? { coordinates: clientLocation, address: locAddress } : null,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed.');
      setLoading(false);
    }
  };

  // Provider availability display
  const sortedAvail = provider.availability
    ?.slice()
    .sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)) || [];

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-4 py-6 sm:py-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto relative my-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
          aria-label="Close booking modal"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        <h3 className="font-bold text-lg mb-1 pr-8">Book {provider.name}</h3>
        <p className="text-white/40 text-sm mb-4">{provider.specialty || ''} · {provider.hourlyRate} {provider.currency}/hr</p>

        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-300 mb-4">{error}</div>}

        {/* Provider availability schedule */}
        {sortedAvail.length > 0 && (
          <div className="mb-4">
            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold">📅 Provider's Schedule</label>
            <div className="mt-2 space-y-1">
              {sortedAvail.map(a => (
                <div key={a.day} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-medium capitalize text-white/60">{a.day}</span>
                  <div className="flex gap-1.5">
                    {a.slots?.map((slot, i) => (
                      <span key={i} className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded">
                        {slot.start} – {slot.end}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Service</label>
            <select value={form.skill} onChange={e => setForm({ ...form, skill: e.target.value })}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
              {provider.skills?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Time</label>
            <input type="time" value={form.timeFrom} onChange={e => setForm({ ...form, timeFrom: e.target.value })}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
          </div>

          {/* Availability match indicator */}
          {availMatch && (
            <div className={`rounded-lg px-3 py-2 text-xs border ${availMatch.match
              ? 'bg-green-500/10 border-green-500/20 text-green-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}>
              {availMatch.message}
            </div>
          )}

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Budget ({provider.currency})</label>
            <input type="number" placeholder="Optional" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50" />
          </div>

          {/* Location sharing */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">📍 Share your location</label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={detectingLoc}
              className="mt-1 w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all py-2.5 rounded-xl text-xs text-white/60 hover:text-white disabled:opacity-40"
            >
              {detectingLoc ? '📡 Detecting...' : clientLocation ? '📍 Update GPS Location' : '📍 Use GPS to share my location'}
            </button>
            
            <div className="mt-2">
              <input 
                type="text" 
                value={locAddress} 
                onChange={(e) => {
                  setLocAddress(e.target.value);
                  // If they manually type without GPS, we just pass null coords with the manual string
                  if (!clientLocation && e.target.value) setClientLocation([0, 0]); 
                }}
                placeholder="Or type your address manually..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            {(clientLocation || locAddress) && (
              <p className="text-[10px] text-white/30 mt-1.5">🔒 Your location will only be shared with this provider after booking.</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-2.5 rounded-xl text-sm font-semibold transition-all">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 rounded-xl text-sm font-semibold transition-all">
            {loading ? 'Booking...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('aiops_chat_history');
    return saved ? JSON.parse(saved) : [
      { role: 'ai', text: "Hi! Describe the service you need — include the location, time, and budget if you have one." }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [viewProfileProvider, setViewProfileProvider] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('aiops_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input };
    const history = messages;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', { message: input, history });
      const aiMsg = {
        role: 'ai',
        text: data.reply,
        providers: data.matchedProviders,
        fallback: data.fallback
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (provider, bookingData) => {
    await api.post('/bookings', {
      providerId: provider.id,
      skill: bookingData.skill,
      date: bookingData.date,
      timeFrom: bookingData.timeFrom,
      budget: bookingData.budget,
      clientLocation: bookingData.clientLocation,
    });
    setBookingTarget(null);
    setBookingSuccess(`Booking request sent to ${provider.name}! They'll confirm shortly.`);
    setTimeout(() => setBookingSuccess(''), 5000);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      {bookingTarget && (
        <BookingModal
          provider={bookingTarget}
          onClose={() => setBookingTarget(null)}
          onConfirm={(data) => handleBook(bookingTarget, data)}
        />
      )}

      {viewProfileProvider && (
        <ProfileViewModal
          providerId={viewProfileProvider.id}
          providerData={null}
          onClose={() => setViewProfileProvider(null)}
        />
      )}

      <Navbar />

      {/* Header bar with New Chat */}
      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-6 flex justify-between items-center shrink-0">
        <h2 className="text-sm font-semibold text-white/50 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          AI Chat Assistant
        </h2>
        <button
          onClick={() => {
            if (window.confirm("Start a new chat? This will clear the current session history.")) {
              localStorage.removeItem('aiops_chat_history');
              setMessages([
                { role: 'ai', text: "Hi! Describe the service you need — include the location, time, and budget if you have one." }
              ]);
            }
          }}
          className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Chat
        </button>
      </div>

      {bookingSuccess && (
        <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-300">
            ✅ {bookingSuccess}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-300 shrink-0 mt-0.5">AI</div>
              )}
              <div className="max-w-[80%]">
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/30 border border-indigo-500/30 text-white rounded-tr-sm'
                    : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-sm'
                }`}>
                  {msg.text}
                  {msg.fallback && (
                    <div className="text-xs text-amber-400/60 mt-2 italic">
                      ⚠️ AI assistant is currently busy - showing basic recommendations
                    </div>
                  )}
                </div>
                {msg.providers?.map((p, j) => (
                  <ProviderCard
                    key={j}
                    provider={p}
                    onBook={setBookingTarget}
                    onViewProfile={setViewProfileProvider}
                  />
                ))}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-300 shrink-0">AI</div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 border-t border-white/5 px-4 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="e.g. I need a plumber in Ariana tomorrow after 5 PM, budget 40 TND..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all px-5 py-3 rounded-xl font-semibold text-sm shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
