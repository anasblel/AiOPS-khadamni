import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

function BookingRow({ booking, isProvider, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const handleStatus = async (status) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${booking._id}/status`, { status });
      onStatusChange(booking._id, status);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    pending: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    accepted: 'text-green-300 bg-green-500/10 border-green-500/20',
    rejected: 'text-red-300 bg-red-500/10 border-red-500/20',
  }[booking.status];

  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">
          {isProvider ? booking.client?.name : booking.provider?.user?.name || 'Provider'}
        </div>
        <div className="text-xs text-white/40 mt-0.5">
          {booking.skill} · {booking.date} {booking.timeFrom && `at ${booking.timeFrom}`}
          {booking.budget ? ` · ${booking.budget} TND` : ''}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium border rounded-full px-2.5 py-1 capitalize ${statusColor}`}>
          {booking.status}
        </span>
        {isProvider && booking.status === 'pending' && (
          <>
            <button onClick={() => handleStatus('accepted')} disabled={loading}
              className="text-xs bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-green-300 px-3 py-1 rounded-lg transition-all disabled:opacity-40">
              Accept
            </button>
            <button onClick={() => handleStatus('rejected')} disabled={loading}
              className="text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-300 px-3 py-1 rounded-lg transition-all disabled:opacity-40">
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    api.get('/bookings/me')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, []);

  const handleStatusChange = (id, newStatus) => {
    setBookings(prev => prev.map(b => b._id === id ? { ...b, status: newStatus } : b));
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const total = bookings.length;
  const completed = bookings.filter(b => b.status === 'accepted').length;
  const pending = bookings.filter(b => b.status === 'pending').length;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-black">AI</div>
          <span className="font-bold text-lg tracking-tight">AIOps <span className="text-indigo-400">Freelance</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/40 hidden sm:block">
            {user?.name} · <span className="capitalize text-indigo-400">{user?.role}</span>
          </span>
          {user?.role === 'provider' && (
            <Link to="/profile" className="text-xs text-white/40 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
              Edit profile
            </Link>
          )}
          <button onClick={handleLogout} className="text-xs text-white/30 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
            Log out
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">Hey, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-white/40 text-sm">
            {user?.role === 'client' ? 'What service do you need today?' : 'Manage your bookings below.'}
          </p>
        </div>

        {user?.role === 'client' ? (
          <div className="space-y-6">
            <Link to="/chat" className="block bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6 hover:bg-indigo-600/15 hover:border-indigo-500/30 transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-2">AI Assistant</div>
                  <h2 className="text-xl font-bold mb-1">Find a service provider</h2>
                  <p className="text-white/40 text-sm">Describe what you need in plain language</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-600/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💬</div>
              </div>
            </Link>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Bookings', value: total, icon: '📋' },
                { label: 'Accepted', value: completed, icon: '✅' },
                { label: 'Pending', value: pending, icon: '⏳' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold">{loadingBookings ? '…' : s.value}</div>
                  <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <h2 className="font-semibold text-sm mb-4 text-white/60 uppercase tracking-wider">My Bookings</h2>
              {loadingBookings ? (
                <p className="text-white/30 text-sm text-center py-4">Loading...</p>
              ) : bookings.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">No bookings yet. Use the AI assistant to find a provider.</p>
              ) : (
                bookings.map(b => (
                  <BookingRow key={b._id} booking={b} isProvider={false} onStatusChange={handleStatusChange} />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total', value: total, icon: '📋' },
                { label: 'Accepted', value: completed, icon: '✅' },
                { label: 'Pending', value: pending, icon: '⏳' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold">{loadingBookings ? '…' : s.value}</div>
                  <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <h2 className="font-semibold text-sm mb-4 text-white/60 uppercase tracking-wider">Booking Requests</h2>
              {loadingBookings ? (
                <p className="text-white/30 text-sm text-center py-4">Loading...</p>
              ) : bookings.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">No booking requests yet. Complete your profile to start receiving matches.</p>
              ) : (
                bookings.map(b => (
                  <BookingRow key={b._id} booking={b} isProvider={true} onStatusChange={handleStatusChange} />
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
