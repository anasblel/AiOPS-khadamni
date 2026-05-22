import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [families, setFamilies] = useState([]);

  // Feature 1 — family + specialty
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [hasCustom, setHasCustom] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState('');

  // Feature 2 — location
  const [city, setCity] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState(null); // [lat, lng]

  // Feature 3 — availability
  const [availability, setAvailability] = useState(
    DAYS.map(day => ({ day, enabled: false, slots: [{ start: '09:00', end: '17:00' }] }))
  );

  // Feature 4 — phone
  const [phone, setPhone] = useState('');

  // CV upload
  const [cvFile, setCvFile] = useState(null);

  // Rate
  const [hourlyRate, setHourlyRate] = useState('');
  const [currency, setCurrency] = useState('TND');

  useEffect(() => {
    const loadData = async () => {
      try {
        const famRes = await api.get('/providers/job-families');
        setFamilies(famRes.data);

        // Fetch existing profile
        const profRes = await api.get('/providers/me');
        const profile = profRes.data;
        if (profile) {
          if (profile.jobFamily) {
            const foundFam = famRes.data.find(f => f.id === profile.jobFamily);
            if (foundFam) {
              setSelectedFamily(foundFam);
              
              if (profile.specialties && profile.specialties.length > 0) {
                const standardSpecialties = profile.specialties.filter(sp => foundFam.specialties.includes(sp));
                const customSpecialties = profile.specialties.filter(sp => !foundFam.specialties.includes(sp));
                setSelectedSpecialties(standardSpecialties);
                if (customSpecialties.length > 0) {
                  setHasCustom(true);
                  setCustomSpecialty(customSpecialties.join(', '));
                }
              } else if (profile.specialty) {
                if (foundFam.specialties.includes(profile.specialty)) {
                  setSelectedSpecialties([profile.specialty]);
                } else {
                  setHasCustom(true);
                  setCustomSpecialty(profile.specialty);
                }
              }
            }
          }
          if (profile.city) setCity(profile.city);
          if (profile.phone) setPhone(profile.phone);
          if (profile.hourlyRate) setHourlyRate(String(profile.hourlyRate));
          if (profile.currency) setCurrency(profile.currency);
          if (profile.workMode) setWorkMode(profile.workMode);
          if (profile.location?.coordinates?.length === 2) {
            setCoordinates([profile.location.coordinates[1], profile.location.coordinates[0]]); // [lat, lng]
          }
          if (profile.availability && profile.availability.length > 0) {
            setAvailability(DAYS.map(dayName => {
              const existing = profile.availability.find(a => a.day === dayName);
              return {
                day: dayName,
                enabled: !!existing,
                slots: existing?.slots || [{ start: '09:00', end: '17:00' }]
              };
            }));
          }
        }
      } catch (err) {
        // Ignore errors (e.g. 404 profile not found on first time setup)
      }
    };
    loadData();
  }, []);

  // Feature 5: remote is auto-determined by family
  const remoteAllowed = selectedFamily?.remoteAllowed !== false;
  const [workMode, setWorkMode] = useState('in-person');

  const handleFamilySelect = (family) => {
    setSelectedFamily(family);
    setSelectedSpecialties([]);
    setHasCustom(false);
    setCustomSpecialty('');
    if (!family.remoteAllowed) setWorkMode('in-person');
  };

  // Feature 2: GPS detect
  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates([pos.coords.latitude, pos.coords.longitude]);
        setDetectingLocation(false);
      },
      () => setDetectingLocation(false)
    );
  };

  // Feature 3: toggle day
  const toggleDay = (dayName) => {
    setAvailability(prev => prev.map(d =>
      d.day === dayName ? { ...d, enabled: !d.enabled } : d
    ));
  };

  const updateSlot = (dayName, field, value) => {
    setAvailability(prev => prev.map(d =>
      d.day === dayName ? { ...d, slots: [{ ...d.slots[0], [field]: value }] } : d
    ));
  };

  const handleSave = async () => {
    if (!selectedFamily) { setError('Please select a job family.'); return; }
    if (!hourlyRate || Number(hourlyRate) <= 0) { setError('Please enter a valid hourly rate.'); return; }
    if (!phone.trim()) { setError('Please enter a phone number.'); return; }

    setSaving(true);
    setError('');
    try {
      const resolvedSpecialties = [...selectedSpecialties];
      if (hasCustom && customSpecialty.trim()) {
        const customs = customSpecialty.split(',').map(s => s.trim()).filter(Boolean);
        resolvedSpecialties.push(...customs);
      }
      const enabledDays = availability.filter(d => d.enabled);

      await api.put('/providers/me', {
        jobFamily: selectedFamily.id,
        specialties: resolvedSpecialties,
        specialty: resolvedSpecialties.length > 0 ? resolvedSpecialties[0] : '',
        skills: resolvedSpecialties,
        city,
        coordinates,  // [lat, lng] or null
        workMode: remoteAllowed ? workMode : 'in-person',
        hourlyRate: Number(hourlyRate),
        currency,
        phone,
      });

      if (enabledDays.length > 0) {
        await api.put('/providers/me/availability', {
          availability: enabledDays.map(d => ({ day: d.day, slots: d.slots }))
        });
      }

      // Upload CV if selected
      if (cvFile) {
        const formData = new FormData();
        formData.append('cv', cvFile);
        await api.post('/providers/me/cv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const totalSteps = 5;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Close button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-sm font-black mx-auto mb-4">AI</div>
          <h1 className="text-2xl font-bold">Set up your provider profile</h1>
          <p className="text-white/40 text-sm mt-1">Step {step} of {totalSteps}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? 'bg-indigo-500' : 'bg-white/10'}`} />
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300 mb-4">{error}</div>
        )}

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">

          {/* ── Step 1: Job Family ── */}
          {step === 1 && (
            <div>
              <h2 className="font-bold text-lg mb-1">What's your field?</h2>
              <p className="text-white/40 text-sm mb-5">Choose the family that best describes your work</p>
              <div className="grid grid-cols-2 gap-2">
                {families.map(family => (
                  <button key={family.id} type="button" onClick={() => handleFamilySelect(family)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedFamily?.id === family.id
                        ? 'border-indigo-500/60 bg-indigo-600/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-white/20'
                    }`}>
                    <span className="text-xl">{family.icon}</span>
                    <div>
                      <div className="font-semibold text-xs">{family.label}</div>
                      {!family.remoteAllowed && (
                        <div className="text-xs text-amber-400/70 mt-0.5">📍 In-person only</div>
                      )}
                    </div>
                    {selectedFamily?.id === family.id && <span className="ml-auto text-indigo-400">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Specialty ── */}
          {step === 2 && selectedFamily && (
            <div>
              <h2 className="font-bold text-lg mb-1">What's your specialty?</h2>
              <p className="text-white/40 text-sm mb-5">
                <span className="text-white">{selectedFamily.icon} {selectedFamily.label}</span> — pick your specific roles (select one or more)
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedFamily.specialties.map(sp => {
                  const isSelected = selectedSpecialties.includes(sp);
                  return (
                    <button key={sp} type="button" onClick={() => {
                      setSelectedSpecialties(prev =>
                        prev.includes(sp) ? prev.filter(x => x !== sp) : [...prev, sp]
                      );
                    }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                      }`}>
                      {sp} {isSelected && '✓'}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setHasCustom(!hasCustom)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    hasCustom
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                  }`}>
                  + Other {hasCustom && '✓'}
                </button>
              </div>
              {hasCustom && (
                <input
                  type="text"
                  placeholder="Describe other specialties (comma separated)..."
                  value={customSpecialty}
                  onChange={e => setCustomSpecialty(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              )}
            </div>
          )}

          {/* ── Step 3: Location ── */}
          {step === 3 && (
            <div>
              <h2 className="font-bold text-lg mb-1">Where are you based?</h2>
              <p className="text-white/40 text-sm mb-5">Clients will search by city — be accurate</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Ariana, Tunis, Sfax, Sousse..."
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>

                <button type="button" onClick={detectLocation} disabled={detectingLocation}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all py-3 rounded-xl text-sm text-white/60 hover:text-white disabled:opacity-40">
                  {detectingLocation ? '📡 Detecting...' : coordinates ? '✅ GPS location saved' : '📍 Use my GPS location (optional)'}
                </button>

                {remoteAllowed && (
                  <div className="border-t border-white/10 pt-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-3 block">Work mode</label>
                    <div className="flex gap-2">
                      {[
                        { val: 'in-person', label: '📍 In-person' },
                        { val: 'remote', label: '💻 Remote' },
                        { val: 'both', label: '🌎 Both' },
                      ].map(opt => (
                        <button key={opt.val} type="button" onClick={() => setWorkMode(opt.val)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            workMode === opt.val ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!remoteAllowed && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300">
                    ⚠️ {selectedFamily?.label} is an in-person service — remote option is not available.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Availability ── */}
          {step === 4 && (
            <div>
              <h2 className="font-bold text-lg mb-1">When are you available?</h2>
              <p className="text-white/40 text-sm mb-5">Enable the days you work and set your hours</p>
              <div className="space-y-2">
                {availability.map(({ day, enabled, slots }) => (
                  <div key={day} className={`rounded-xl border transition-all ${enabled ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button type="button" onClick={() => toggleDay(day)}
                        className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center text-xs ${
                          enabled ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/20 text-transparent'
                        }`}>
                        ✓
                      </button>
                      <span className={`text-sm font-medium capitalize w-24 ${enabled ? 'text-white' : 'text-white/40'}`}>{day}</span>
                      {enabled && (
                        <div className="flex items-center gap-2 ml-auto">
                          <input type="time" value={slots[0].start}
                            onChange={e => updateSlot(day, 'start', e.target.value)}
                            className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                          <span className="text-white/30 text-xs">to</span>
                          <input type="time" value={slots[0].end}
                            onChange={e => updateSlot(day, 'end', e.target.value)}
                            className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 5: Rate + Phone ── */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-lg mb-1">Rate & Contact</h2>
                <p className="text-white/40 text-sm mb-5">How much do you charge, and how can clients reach you after booking?</p>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Hourly rate</label>
                <div className="flex gap-3">
                  <input type="number" placeholder="35" min="0"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                  />
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none">
                    <option value="TND" className="bg-[#12121a]">TND</option>
                    <option value="EUR" className="bg-[#12121a]">EUR</option>
                    <option value="USD" className="bg-[#12121a]">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Phone / WhatsApp</label>
                <input type="tel" placeholder="+216 XX XXX XXX"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
                <p className="text-xs text-white/30 mt-2">🔒 Only shown to clients after a booking is accepted.</p>
              </div>

              {/* CV Upload */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Upload CV / Resume (optional)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCvFile(e.target.files[0] || null)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 transition-all cursor-pointer"
                />
                {cvFile && (
                  <p className="text-xs text-green-300 mt-1.5">📄 {cvFile.name} selected</p>
                )}
                <p className="text-xs text-white/30 mt-1.5">PDF, DOC or DOCX · Max 5 MB · Clients can view your CV when booking.</p>
              </div>

              {/* Summary */}
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-4 space-y-1 text-xs">
                <p className="text-indigo-300 font-semibold uppercase tracking-wider mb-2">Summary</p>
                <p className="text-white/60">🏷 <span className="text-white">{selectedFamily?.label} — {
                  [
                    ...selectedSpecialties,
                    ...(hasCustom && customSpecialty.trim() ? customSpecialty.split(',').map(s => s.trim()).filter(Boolean) : [])
                  ].join(', ') || 'No specialty selected'
                }</span></p>
                <p className="text-white/60">📍 <span className="text-white">{city || 'No city set'}</span>{!remoteAllowed ? ' (in-person only)' : workMode === 'both' ? ' · Remote & In-person' : workMode === 'remote' ? ' · Remote' : ' · In-person'}</p>
                <p className="text-white/60">📅 <span className="text-white">{availability.filter(d => d.enabled).map(d => d.day).join(', ') || 'No days set'}</span></p>
                <p className="text-white/60">💰 <span className="text-white">{hourlyRate || '—'} {currency}/hr</span></p>
                {cvFile && <p className="text-white/60">📄 <span className="text-white">CV: {cvFile.name}</span></p>}
              </div>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button onClick={() => { setError(''); setStep(step - 1); }}
              className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 transition-all py-3 rounded-xl font-semibold text-sm">
              ← Back
            </button>
          )}
          {step < totalSteps ? (
            <button
              onClick={() => { setError(''); setStep(step + 1); }}
              disabled={
                (step === 1 && !selectedFamily) ||
                (step === 2 && selectedSpecialties.length === 0 && (!hasCustom || !customSpecialty.trim()))
              }
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all py-3 rounded-xl font-semibold text-sm">
              Continue →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all py-3 rounded-xl font-semibold text-sm">
              {saving ? 'Saving...' : 'Save profile →'}
            </button>
          )}
        </div>
        <p className="text-center text-xs text-white/20 mt-4">You can update this anytime from your dashboard</p>
      </div>
    </div>
  );
}
