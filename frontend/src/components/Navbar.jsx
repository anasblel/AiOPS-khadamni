import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../api/axios';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadDMs, setUnreadDMs] = useState(0);
  const socketRef = useRef(null);

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const { data } = await api.get('/messages/conversations');
      const total = data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadDMs(total);
    } catch {}
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join', user.id);

    socket.on('direct_message', () => {
      fetchUnreadCount();
    });

    return () => socket.disconnect();
  }, [user?.id]);

  if (!user) return null;

  return (
    <nav className="relative z-50 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 shrink-0">
      <div className="flex items-center gap-6 flex-1">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-black text-white">AI</div>
          <span className="font-bold text-lg tracking-tight text-white">AIOps <span className="text-indigo-400">Khadamni</span></span>
        </Link>
        
        {/* Nav Links */}
        <div className="flex items-center gap-4 text-xs sm:text-sm font-medium ml-4">
          <Link
            to="/dashboard"
            className={`transition-colors ${location.pathname === '/dashboard' ? 'text-indigo-400' : 'text-white/60 hover:text-white'}`}
          >
            Dashboard
          </Link>
          {user.role === 'client' && (
            <Link
              to="/chat"
              className={`transition-colors ${location.pathname === '/chat' ? 'text-indigo-400' : 'text-white/60 hover:text-white'}`}
            >
              AI Assistant
            </Link>
          )}
          <Link
            to="/messages"
            className={`transition-colors ${location.pathname.startsWith('/messages') ? 'text-indigo-400' : 'text-white/60 hover:text-white'}`}
          >
            Direct Messages
          </Link>
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className={`transition-colors ${location.pathname === '/admin' ? 'text-indigo-400' : 'text-white/60 hover:text-white'}`}
            >
              Admin Panel
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role badge for screens > sm */}
        <span className="text-xs text-white/40 hidden sm:block">
          {user.name} · <span className="capitalize text-indigo-400 font-semibold">{user.role}</span>
        </span>
        
        {/* Direct Messages Icon Button */}
        <Link
          to="/messages"
          className="relative text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          aria-label="Direct Messages"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadDMs > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-indigo-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">
              {unreadDMs > 9 ? '9+' : unreadDMs}
            </span>
          )}
        </Link>

        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </nav>
  );
}
