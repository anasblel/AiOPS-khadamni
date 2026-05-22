import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch notifications on mount
  useEffect(() => {
    api.get('/notifications/me')
      .then(r => setNotifications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Socket.io real-time notifications
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join', user.id);
    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });
    return () => socket.disconnect();
  }, [user?.id]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleNotificationClick = async (n) => {
    // Mark as read
    if (!n.read) {
      try {
        await api.patch(`/notifications/${n._id}/read`);
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      } catch {}
    }

    // Navigate to the relevant page based on type
    setOpen(false);
    if (n.type === 'booking_created') {
      // Provider: go to pending tab
      navigate('/dashboard?tab=pending');
    } else if (n.type === 'booking_accepted') {
      // Client: go to active bookings
      navigate('/dashboard?tab=active');
    } else if (n.type === 'booking_rejected') {
      // Client: go to history
      navigate('/dashboard?tab=history');
    } else if (n.type === 'booking_completed') {
      // Provider: go to history
      navigate('/dashboard?tab=history');
    } else if (n.type === 'booking_deleted') {
      navigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const typeIcon = {
    booking_created: '📋',
    booking_accepted: '✅',
    booking_rejected: '❌',
    booking_completed: '⭐',
    booking_deleted: '🗑️',
  };

  const typeColor = {
    booking_created: 'border-blue-500/20 bg-blue-500/5',
    booking_accepted: 'border-green-500/20 bg-green-500/5',
    booking_rejected: 'border-red-500/20 bg-red-500/5',
    booking_completed: 'border-amber-500/20 bg-amber-500/5',
    booking_deleted: 'border-white/10 bg-white/[0.03]',
  };

  const typeActionLabel = {
    booking_created: '→ View pending requests',
    booking_accepted: '→ View active bookings',
    booking_rejected: '→ View history',
    booking_completed: '→ View history',
    booking_deleted: '→ Go to dashboard',
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-white/30 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-white/30 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors group ${!n.read ? 'bg-indigo-500/[0.04]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${typeColor[n.type] || 'border-white/10 bg-white/[0.03]'}`}>
                      {typeIcon[n.type] || '🔔'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">{n.title}</span>
                        {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.message}</p>

                      {/* Booking details */}
                      {n.bookingDetails && (
                        <div className={`mt-2 rounded-lg border px-3 py-2 ${typeColor[n.type] || 'border-white/10 bg-white/[0.03]'}`}>
                          <div className="text-xs text-white/60">
                            🏷 {n.bookingDetails.skill} · 📅 {n.bookingDetails.date}
                            {n.bookingDetails.timeFrom && ` at ${n.bookingDetails.timeFrom}`}
                            {n.bookingDetails.budget ? ` · 💰 ${n.bookingDetails.budget} TND` : ''}
                          </div>
                        </div>
                      )}

                      {/* Contact phone (shown on accepted bookings) */}
                      {n.contactPhone && (
                        <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <a href={`tel:${n.contactPhone}`}
                            className="text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2.5 py-1 rounded-lg hover:bg-green-500/20 transition-all">
                            📞 {n.contactPhone}
                          </a>
                          <a href={`https://wa.me/${n.contactPhone.replace(/\D/g, '')}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 transition-all">
                            💬 WhatsApp
                          </a>
                        </div>
                      )}

                      {/* Location info */}
                      {n.location?.address && (
                        <div className="mt-1.5 text-xs text-white/40">
                          📍 {n.location.address}
                        </div>
                      )}

                      {/* Navigate action hint */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-white/20">{new Date(n.createdAt).toLocaleString()}</span>
                        <span className="text-[10px] text-indigo-400/60 group-hover:text-indigo-400 transition-colors font-medium">
                          {typeActionLabel[n.type] || '→ View dashboard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-white/5 text-center">
              <p className="text-xs text-white/20">{notifications.length} total notification{notifications.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
