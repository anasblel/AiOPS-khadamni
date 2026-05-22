import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
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
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-4 py-6 sm:py-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto relative my-auto">
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

function BookingRow({ booking, isProvider, onStatusChange, onViewProfile, onViewDetails, onDelete, onCompleteJob }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStatus = async (status) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${booking._id}/status`, { status });
      onStatusChange(booking._id, status);
    } finally {
      setLoading(false);
    }
  };

  const statusStyle = {
    pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.05)]',
    accepted: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)]',
    rejected: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.05)]',
    completed: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.05)]',
  }[booking.status];

  const otherPartyPhone = isProvider
    ? booking.client?.phone
    : booking.provider?.user?.phone;

  const otherPartyUserId = isProvider
    ? booking.client?._id
    : booking.provider?.user?._id;

  const otherPartyName = isProvider
    ? booking.client?.name
    : booking.provider?.user?.name || 'Provider';

  return (
    <div className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all duration-300 shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-[2px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        
        {/* Main Details */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="font-semibold text-base text-white tracking-tight">
              {otherPartyName}
            </span>
            
            {!isProvider && booking.provider && (
              <button
                onClick={() => onViewProfile(booking.provider._id)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors border-b border-indigo-400/20 hover:border-indigo-300"
              >
                View Profile
              </button>
            )}

            <span className={`text-[10px] uppercase tracking-wider font-semibold border rounded-full px-2.5 py-0.5 capitalize inline-block ${statusStyle}`}>
              {booking.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/50">
            <div className="flex items-center gap-1.5">
              <span className="text-indigo-400 text-sm">💼</span>
              <span className="font-medium text-white/70">{booking.skill}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-indigo-400 text-sm">📅</span>
              <span>{booking.date}</span>
            </div>
            {booking.timeFrom && (
              <div className="flex items-center gap-1.5">
                <span className="text-indigo-400 text-sm">⏰</span>
                <span>{booking.timeFrom}</span>
              </div>
            )}
            {booking.budget && (
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 text-sm">💰</span>
                <span className="font-semibold text-emerald-400">{booking.budget} TND</span>
              </div>
            )}
          </div>

          {/* Contact Details */}
          {booking.status === 'accepted' && (
            <div className="pt-1.5">
              <ContactBadge phone={otherPartyPhone} />
            </div>
          )}

          {/* Client Rating and Feedback */}
          {booking.status === 'completed' && booking.rating && (
            <div className="pt-1 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-1.5 w-fit">
                <span>{'★'.repeat(booking.rating)}{'☆'.repeat(5 - booking.rating)}</span>
                <span className="text-white/40 font-normal">({booking.rating}/5)</span>
                <span className="text-white/30 font-normal">· Client Feedback</span>
              </div>
              {booking.review && (
                <p className="text-xs text-white/60 italic pl-3 border-l-2 border-white/10 mt-1">
                  "{booking.review}"
                </p>
              )}
            </div>
          )}

          {/* Client Location details */}
          {isProvider && booking.status === 'accepted' && booking.clientLocation?.address && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span>📍</span>
              <span className="truncate">{booking.clientLocation.address}</span>
            </div>
          )}

          {/* Provider City Location details */}
          {!isProvider && booking.provider?.city && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span>📍</span>
              <span className="truncate">{booking.provider.city}</span>
            </div>
          )}

          {booking.providerMessage && (
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-xs text-white/40 italic">
              "{booking.providerMessage}"
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => onViewDetails(booking)}
            className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white px-3 py-2 rounded-xl transition-all font-medium"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Details
          </button>
          
          {otherPartyUserId && (
            <button
              onClick={() => navigate(`/messages/${otherPartyUserId}`)}
              className="flex items-center gap-1.5 text-xs bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 text-indigo-300 px-3 py-2 rounded-xl transition-all font-medium shadow-md shadow-indigo-950/20"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Message
            </button>
          )}

          {isProvider && booking.status === 'pending' && (
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 ml-1">
              <button 
                onClick={() => handleStatus('accepted')} 
                disabled={loading}
                className="flex items-center gap-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 px-3 py-2 rounded-xl transition-all font-semibold disabled:opacity-40"
              >
                Accept
              </button>
              <button 
                onClick={() => handleStatus('rejected')} 
                disabled={loading}
                className="flex items-center gap-1 text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 px-3 py-2 rounded-xl transition-all font-semibold disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          )}

          {!isProvider && booking.status === 'accepted' && (
            <button
              onClick={() => onCompleteJob(booking)}
              className="flex items-center gap-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 px-3 py-2 rounded-xl transition-all font-semibold shadow-md shadow-amber-950/20"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Finish & Rate
            </button>
          )}

          <button
            onClick={() => onDelete(booking._id)}
            className="p-2 bg-rose-500/5 hover:bg-rose-500/20 border border-rose-500/10 hover:border-rose-500/30 text-rose-400 rounded-xl transition-all"
            title="Delete request"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Complete Job & Rate Modal ─────────────────────────────────────────────────
function CompleteJobModal({ booking, onClose, onConfirm }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleConfirm = async () => {
    if (!rating) { setError('Please select a rating before submitting.'); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm({ bookingId: booking._id, rating, review });
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const providerName = booking.provider?.user?.name || 'the provider';
  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-4 py-6 sm:py-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#12121a] border border-white/10 rounded-2xl p-7 w-full max-w-md relative shadow-2xl shadow-black/60 my-auto overflow-y-auto max-h-[calc(100vh-3rem)]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        {/* Icon + Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-3xl mb-3">
            🏁
          </div>
          <h3 className="font-bold text-xl text-white">Mark Job as Completed</h3>
          <p className="text-sm text-white/40 mt-1">
            Rate your experience with <span className="text-white/70 font-medium">{providerName}</span>
          </p>
          <div className="mt-2 text-xs text-white/30">
            {booking.skill} · {booking.date}
          </div>
        </div>

        {/* Star Rating */}
        <div className="mb-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold text-center mb-3">Your Rating</p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110 active:scale-95"
                aria-label={`Rate ${star} stars`}
              >
                <svg
                  width="36" height="36" viewBox="0 0 24 24"
                  fill={(hovered || rating) >= star ? '#f59e0b' : 'none'}
                  stroke={(hovered || rating) >= star ? '#f59e0b' : 'rgba(255,255,255,0.2)'}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="transition-all"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <p className="text-center text-sm font-semibold text-amber-400 mt-2 transition-all">
              {ratingLabels[hovered || rating]}
            </p>
          )}
        </div>

        {/* Review textarea */}
        <div className="mb-5">
          <label className="text-xs text-white/40 uppercase tracking-wider font-semibold block mb-1.5">
            Leave a Review <span className="text-white/20 normal-case">(optional)</span>
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            placeholder="Share your experience to help others..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none transition-all"
          />
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl text-sm font-semibold transition-all text-white/70"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !rating}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-bold transition-all text-white shadow-lg shadow-amber-500/20"
          >
            {loading ? 'Submitting...' : '⭐ Submit & Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [viewProfileId, setViewProfileId] = useState(null);
  const [viewDetailBooking, setViewDetailBooking] = useState(null);
  const [completeJobBooking, setCompleteJobBooking] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['active', 'pending', 'history'].includes(tab)) return tab;
    return user?.role === 'provider' ? 'pending' : 'active';
  });

  // Sync tab from URL when navigating via notification
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['active', 'pending', 'history'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const fetchBookings = () => {
    api.get('/bookings/me')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Real-time booking socket synchronization
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socket.emit('join', user.id);

    const handleUpdate = (data) => {
      fetchBookings();
    };

    socket.on('booking_update', handleUpdate);
    socket.on('notification', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  const handleStatusChange = (id, newStatus) =>
    setBookings(prev => prev.map(b => b._id === id ? { ...b, status: newStatus } : b));

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      setBookings(prev => prev.filter(b => b._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete booking');
    }
  };

  const handleCompleteJob = async ({ bookingId, rating, review }) => {
    try {
      await api.patch(`/bookings/${bookingId}/complete`, { rating, review });
      setBookings(prev => prev.map(b =>
        b._id === bookingId ? { ...b, status: 'completed', rating, review } : b
      ));
      setCompleteJobBooking(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete booking');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Calculate high-end statistics
  const isClient = user?.role === 'client';
  const total = bookings.length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const completed = bookings.filter(b => b.status === 'accepted').length;
  const pending = bookings.filter(b => b.status === 'pending').length;
  const totalFinancial = bookings
    .filter(b => b.status === 'accepted' || b.status === 'completed')
    .reduce((sum, b) => sum + (Number(b.budget) || 0), 0);

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter(b => {
    if (isClient) {
      if (activeTab === 'active') return b.status === 'pending' || b.status === 'accepted';
      // History: completed + rejected
      return b.status === 'rejected' || b.status === 'completed';
    } else {
      if (activeTab === 'pending') return b.status === 'pending';
      if (activeTab === 'active') return b.status === 'accepted';
      // History: completed + rejected
      return b.status === 'rejected' || b.status === 'completed';
    }
  });

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0a0a0f] to-[#0a0a0f]" />
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
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

      {/* Complete Job & Rate Modal */}
      {completeJobBooking && (
        <CompleteJobModal
          booking={completeJobBooking}
          onClose={() => setCompleteJobBooking(null)}
          onConfirm={handleCompleteJob}
        />
      )}

      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 space-y-8">
        
        {/* Profile Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white via-white to-indigo-400 bg-clip-text text-transparent">
              Hey, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-white/40 text-sm">
              {isClient ? 'What service do you need today?' : 'Manage your business availability, jobs, and requests.'}
            </p>
          </div>
          {!isClient && (
            <Link 
              to="/setup-profile" 
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-600/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit Profile & Avails
            </Link>
          )}
        </div>

        {/* AI Assistant Banner for Clients */}
        {isClient && (
          <Link to="/chat" className="relative block overflow-hidden bg-gradient-to-r from-indigo-950/40 to-purple-950/20 border border-indigo-500/20 rounded-3xl p-6 hover:bg-indigo-950/60 hover:border-indigo-500/35 transition-all duration-300 group shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  AI Assistant
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white mt-1">Need to find a service provider?</h2>
                <p className="text-white/55 text-sm max-w-md">Our intelligence assistant will match you based on specialties, city location, budget, and real-time availability.</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">🤖</div>
            </div>
          </Link>
        )}

        {/* Analytical Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: isClient ? 'Total Spent' : 'Total Revenue',
              value: `${totalFinancial} TND`,
              icon: '💵',
              desc: 'Accepted + completed value',
              color: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-400'
            },
            {
              label: isClient ? 'Active Requests' : 'Active Jobs',
              value: completed,
              icon: '✅',
              desc: 'Currently accepted',
              color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-400'
            },
            {
              label: 'Pending Approval',
              value: pending,
              icon: '⏳',
              desc: 'Awaiting response',
              color: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400'
            },
            {
              label: 'Jobs Completed',
              value: completedCount,
              icon: '🏁',
              desc: 'Finished & rated',
              color: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400'
            }
          ].map(s => (
            <div key={s.label} className={`relative overflow-hidden bg-gradient-to-b ${s.color} border rounded-3xl p-5 shadow-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                <span className="text-xl">{s.icon}</span>
              </div>
              <div className="text-3xl font-extrabold tracking-tight text-white mb-1">{loadingBookings ? '…' : s.value}</div>
              <div className="text-[10px] text-white/30 font-medium">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Dynamic Tab Filter Menu */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            
            {/* Tabs */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 p-1 rounded-2xl w-fit">
              {isClient ? (
                <>
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'active' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                  >
                    Active Bookings ({bookings.filter(b => b.status === 'pending' || b.status === 'accepted').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                  >
                    History ({bookings.filter(b => b.status === 'rejected' || b.status === 'completed').length})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'pending' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                  >
                    Pending Requests ({pending})
                  </button>
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'active' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                  >
                    Active Jobs ({completed})
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                  >
                    History ({bookings.filter(b => b.status === 'rejected' || b.status === 'completed').length})
                  </button>
                </>
              )}
            </div>

            <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest shrink-0">
              {loadingBookings ? 'Loading requests...' : `${filteredBookings.length} items`}
            </h3>
          </div>

          {/* Bookings List rendering */}
          {loadingBookings ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest">Retrieving booking requests...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="text-4xl">📭</div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white/70 text-sm">No items found for this filter</h4>
                <p className="text-white/30 text-xs max-w-xs mx-auto">
                  {isClient 
                    ? 'No requests match this tab. Use the AI Assistant to book a matching provider.'
                    : 'Your record is completely clean. No pending or archived items to show.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5 space-y-4">
              {filteredBookings.map(b => (
                <BookingRow
                  key={b._id}
                  booking={b}
                  isProvider={!isClient}
                  onStatusChange={handleStatusChange}
                  onViewProfile={setViewProfileId}
                  onViewDetails={setViewDetailBooking}
                  onDelete={handleDeleteBooking}
                  onCompleteJob={setCompleteJobBooking}
                />
              ))}
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
