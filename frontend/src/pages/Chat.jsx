import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function ProviderCard({ provider, onBook }) {
  return (
    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 mt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-sm text-white">{provider.name}</div>
          <div className="text-xs text-white/50 mt-0.5">
            {provider.isRemote ? '💻 Remote' : '📍 In-person'} · {provider.hourlyRate} {provider.currency}/hr
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {provider.skills?.map(s => (
              <span key={s} className="text-xs bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-white/60">{s}</span>
            ))}
          </div>
        </div>
        <button
          onClick={() => onBook(provider)}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-500 transition-colors text-xs font-semibold px-3 py-2 rounded-lg"
        >
          Book
        </button>
      </div>
    </div>
  );
}

function BookingModal({ provider, onClose, onConfirm }) {
  const [form, setForm] = useState({ skill: provider.skills?.[0] || '', date: '', timeFrom: '', budget: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!form.date || !form.timeFrom) { setError('Please fill in date and time.'); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm({ ...form, budget: Number(form.budget) });
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-lg mb-1">Book {provider.name}</h3>
        <p className="text-white/40 text-sm mb-5">{provider.hourlyRate} {provider.currency}/hr</p>

        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-300 mb-4">{error}</div>}

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
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Budget ({provider.currency})</label>
            <input type="number" placeholder="Optional" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50" />
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
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! Describe the service you need — include the location, time, and budget if you have one." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const bottomRef = useRef(null);

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

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-white/40 hover:text-white transition-colors text-sm">← Dashboard</Link>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium">AI Assistant</span>
          </div>
        </div>
        <span className="text-xs text-white/30 hidden sm:block">{user?.name}</span>
      </nav>

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
                  <ProviderCard key={j} provider={p} onBook={setBookingTarget} />
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
