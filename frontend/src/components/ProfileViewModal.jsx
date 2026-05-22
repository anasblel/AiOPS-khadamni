import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ProfileViewModal({ providerId, onClose, providerData }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(providerData || null);
  const [loading, setLoading] = useState(!providerData);
  const [error, setError] = useState('');
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!providerData && providerId) {
      setLoading(true);
      api.get(`/providers/${providerId}`)
        .then(r => setProvider(r.data))
        .catch(() => setError('Failed to load profile.'))
        .finally(() => setLoading(false));
    }
  }, [providerId, providerData]);

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

  const hasLocation = provider?.location?.coordinates &&
    provider.location.coordinates.length === 2 &&
    (provider.location.coordinates[0] !== 0 || provider.location.coordinates[1] !== 0);

  // Leaflet uses [lat, lng] but provider stores [lng, lat]
  const mapCenter = hasLocation
    ? [provider.location.coordinates[1], provider.location.coordinates[0]]
    : null;

  const sortedAvailability = provider?.availability
    ?.slice()
    .sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)) || [];

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-4 py-6 sm:py-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Provider Profile"
    >
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-auto relative my-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white z-10"
          aria-label="Close profile"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        {loading ? (
          <div className="p-12 text-center text-white/40 text-sm">Loading profile...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-300 text-sm">{error}</div>
        ) : provider ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pr-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white shrink-0">
                {provider.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-lg text-white truncate">{provider.user?.name}</h2>
                <p className="text-sm text-indigo-400 font-medium">
                  {(provider.specialties && provider.specialties.length > 0)
                    ? provider.specialties.join(', ')
                    : (provider.specialty || provider.jobFamily || 'Service Provider')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {provider.city && (
                    <span className="text-xs text-white/40 flex items-center gap-1">📍 {provider.city}</span>
                  )}
                  {provider.workMode && (
                    <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md">
                      {provider.workMode === 'both' ? '🌎 Remote & In-person' : provider.workMode === 'remote' ? '💻 Remote' : '📍 In-person'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rate */}
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-2xl font-bold text-white">{provider.hourlyRate || '—'}</div>
                <div className="text-xs text-white/40">{provider.currency || 'TND'}/hr</div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-2xl font-bold text-white">⭐ {provider.rating || '0'}</div>
                <div className="text-xs text-white/40">Rating</div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-2xl font-bold text-white">{provider.totalBookings || '0'}</div>
                <div className="text-xs text-white/40">Bookings</div>
              </div>
            </div>

            {/* Message Button */}
            {user && provider.user && user.id !== provider.user._id && (
              <div className="mb-6">
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/messages/${provider.user._id}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Message Provider
                </button>
              </div>
            )}

            {/* Skills */}
            {provider.skills?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {provider.skills.map(s => (
                    <span key={s} className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg px-2.5 py-1">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* CV */}
            {provider.cvPath && (
              <div className="mb-6">
                <h3 className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">📄 Curriculum Vitae</h3>
                <a
                  href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${provider.cvPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500/20 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  View / Download CV
                </a>
              </div>
            )}

            {/* Availability */}
            {sortedAvailability.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">📅 Availability</h3>
                <div className="space-y-1.5">
                  {sortedAvailability.map(a => (
                    <div key={a.day} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium capitalize text-white/70">{a.day}</span>
                      <div className="flex gap-2">
                        {a.slots?.map((slot, i) => (
                          <span key={i} className="text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-md">
                            {slot.start} – {slot.end}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {hasLocation && mapCenter && (
              <div className="mb-4">
                <h3 className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">📍 Location</h3>
                <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: '200px' }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={mapCenter}>
                      <Popup>{provider.user?.name} — {provider.city || 'Location'}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
