import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import ProfileViewModal from '../components/ProfileViewModal';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// Feature 4: show phone/WhatsApp only on accepted bookings
function ContactBadge({ phone }) {
  if (!phone) return null;
  const wa = `https://wa.me/${phone.replace(/\D/g, '')}`;
  return (
    <div className="flex items-center gap-2 mt-2">
      <a href={`tel:${phone}`}
        className="text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2.5 py-1 rounded-lg hover:bg-green-500/20 transition-all">
        📞 {phone}
      </a>
      <a href={wa} target="_blank" rel="noreferrer"
        className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 transition-all">
        💬 WhatsApp
      </a>
    </div>
  );
}

// Location mini-map for accepted bookings
function LocationBadge({ coordinates, address, label }) {
  const [showMap, setShowMap] = useState(false);
  if (!coordinates || coordinates.length !== 2) {
    if (address) return <div className="text-xs text-white/40 mt-1">📍 {address}</div>;
    return null;
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setShowMap(!showMap)}
        className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg hover:bg-blue-500/20 transition-all"
      >
        📍 {showMap ? 'Hide map' : (address || `${label || 'View'} location`)}
      </button>
      {showMap && (
        <div className="mt-2 rounded-xl overflow-hidden border border-white/10" style={{ height: '150px' }}>
          <MapContainer
            center={coordinates}
            zoom={14}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={coordinates}>
              <Popup>{address || label || 'Location'}</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}
    </div>
  );
}

// Booking Details Modal
function BookingDetailModal({ booking, isProvider, onClose }) {
  // ESC key to close
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const otherPartyPhone = isProvider
    ? booking.client?.phone
    : booking.provider?.user?.phone;

  const statusColor = {
    pending: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    accepted: 'text-green-300 bg-green-500/10 border-green-500/20',
    rejected: 'text-red-300 bg-red-500/10 border-red-500/20',
  }[booking.status];

  // For provider: show client location. For client: show provider location
  const providerLocation = booking.provider?.location;
  const clientLoc = booking.clientLocation;

  // Provider location as [lat, lng]
  const providerMapCoords = providerLocation?.coordinates?.length === 2
    ? [providerLocation.coordinates[1], providerLocation.coordinates[0]]
    : null;

  // Client location as [lat, lng]
  const clientMapCoords = clientLoc?.coordinates?.length === 2
    ? clientLoc.coordinates
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        <h3 className="font-bold text-lg mb-1 pr-8">Booking Details</h3>
        <span className={`text-xs font-medium border rounded-full px-2.5 py-1 capitalize inline-block mb-4 ${statusColor}`}>
          {booking.status}
        </span>

        <div className="space-y-3">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
              {isProvider ? 'Client' : 'Provider'}
            </div>
            <div className="font-semibold text-sm">
              {isProvider ? booking.client?.name : booking.provider?.user?.name || 'Provider'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Service</div>
              <div className="text-sm font-medium">{booking.skill}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Budget</div>
              <div className="text-sm font-medium">{booking.budget ? `${booking.budget} TND` : '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">📅 Date</div>
              <div className="text-sm font-medium">{booking.date}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">⏰ Time</div>
              <div className="text-sm font-medium">{booking.timeFrom || '—'}</div>
            </div>
          </div>

          {booking.providerMessage && (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Provider Note</div>
              <p className="text-sm text-white/60 italic">"{booking.providerMessage}"</p>
            </div>
          )}

          {/* Contact info on accepted */}
          {booking.status === 'accepted' && otherPartyPhone && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
              <div className="text-xs text-green-300/60 uppercase tracking-wider mb-1">
                📞 {isProvider ? "Client's" : "Provider's"} Contact
              </div>
              <ContactBadge phone={otherPartyPhone} />
            </div>
          )}

          {/* Location: Provider sees client location */}
          {isProvider && booking.status === 'accepted' && clientMapCoords && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">📍 Client's Location</div>
              <LocationBadge
                coordinates={clientMapCoords}
                address={clientLoc?.address}
                label="Client"
              />
            </div>
          )}

          {/* Location: Client sees provider location */}
          {!isProvider && providerMapCoords && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">📍 Provider's Location</div>
              <LocationBadge
                coordinates={providerMapCoords}
                address={booking.provider?.city}
                label="Provider"
              />
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-white/5 border border-white/10 hover:bg-white/10 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function BookingRow({ booking, isProvider, onStatusChange, onViewProfile, onViewDetails }) {
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

  // Feature 4: get phone from the other party
  const otherPartyPhone = isProvider
    ? booking.client?.phone
    : booking.provider?.user?.phone;

  return (
    <div className="py-4 border-b border-white/5 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm">
              {isProvider ? booking.client?.name : booking.provider?.user?.name || 'Provider'}
            </div>
            {/* View Profile button */}
            {!isProvider && booking.provider && (
              <button
                onClick={() => onViewProfile(booking.provider._id)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
              >
                View Profile
              </button>
            )}
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            {booking.skill} · {booking.date}
            {booking.timeFrom && ` at ${booking.timeFrom}`}
            {booking.budget ? ` · ${booking.budget} TND` : ''}
          </div>
          {/* Feature 4: show contact only after accepted */}
          {booking.status === 'accepted' && (
            <ContactBadge phone={otherPartyPhone} />
          )}
          {/* Show client location for provider on accepted */}
          {isProvider && booking.status === 'accepted' && booking.clientLocation?.address && (
            <div className="text-xs text-white/40 mt-1">📍 {booking.clientLocation.address}</div>
          )}
          {/* Show provider city for client */}
          {!isProvider && booking.provider?.city && (
            <div className="text-xs text-white/40 mt-1">📍 {booking.provider.city}</div>
          )}
          {booking.providerMessage && (
            <p className="text-xs text-white/40 mt-1 italic">"{booking.providerMessage}"</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onViewDetails(booking)}
            className="text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white px-2.5 py-1 rounded-lg transition-all"
          >
            Details
          </button>
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
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [viewProfileId, setViewProfileId] = useState(null);
  const [viewDetailBooking, setViewDetailBooking] = useState(null);

  useEffect(() => {
    api.get('/bookings/me')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, []);

  const handleStatusChange = (id, newStatus) =>
    setBookings(prev => prev.map(b => b._id === id ? { ...b, status: newStatus } : b));

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

      {/* Profile View Modal */}
      {viewProfileId && (
        <ProfileViewModal
          providerId={viewProfileId}
          onClose={() => setViewProfileId(null)}
        />
      )}

      {/* Booking Detail Modal */}
      {viewDetailBooking && (
        <BookingDetailModal
          booking={viewDetailBooking}
          isProvider={user?.role === 'provider'}
          onClose={() => setViewDetailBooking(null)}
        />
      )}

      <nav className="relative z-50 flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-black">AI</div>
          <span className="font-bold text-lg tracking-tight">AIOps <span className="text-indigo-400">Khadamni</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40 hidden sm:block">
            {user?.name} · <span className="capitalize text-indigo-400">{user?.role}</span>
          </span>
          <NotificationBell />
          <UserMenu />
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
                  <p className="text-white/40 text-sm">Describe what you need — city, time, budget</p>
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
                  <BookingRow
                    key={b._id}
                    booking={b}
                    isProvider={false}
                    onStatusChange={handleStatusChange}
                    onViewProfile={setViewProfileId}
                    onViewDetails={setViewDetailBooking}
                  />
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
                <p className="text-white/30 text-sm text-center py-4">No booking requests yet.</p>
              ) : (
                bookings.map(b => (
                  <BookingRow
                    key={b._id}
                    booking={b}
                    isProvider={true}
                    onStatusChange={handleStatusChange}
                    onViewProfile={setViewProfileId}
                    onViewDetails={setViewDetailBooking}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
