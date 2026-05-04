import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [skillOptions, setSkillOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  
  const [form, setForm] = useState({
    skills: [],
    isRemote: false,
    hourlyRate: '',
    currency: 'TND',
  });

  // Load available skills
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const res = await api.get('/providers/skills/all');
        setSkillOptions(res.data.skills || []);
      } catch (err) {
        console.error('Failed to load skills:', err);
        // Fallback to predefined skills if API fails
        setSkillOptions([
          'Plumbing', 'Electrical', 'Carpentry', 'Cleaning',
          'React', 'Node.js', 'UI/UX Design', 'Photography',
          'Translation', 'CV Review', 'Math Tutoring', 'Logo Design',
          'Web Development', 'Mobile App Development', 'Cloud Architecture',
          'Data Analysis', 'Machine Learning', 'Consulting'
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadSkills();
  }, []);

  const toggleSkill = (skill) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) {
      setError('Please enter a skill name');
      return;
    }

    setAddingSkill(true);
    setError('');
    try {
      const res = await api.post('/providers/skills/add', { skill: newSkill });
      const addedSkill = res.data.skill;
      
      // Add to skill options if not already there
      if (!skillOptions.includes(addedSkill)) {
        setSkillOptions(prev => [...prev, addedSkill].sort());
      }
      
      // Add to selected skills
      if (!form.skills.includes(addedSkill)) {
        setForm(prev => ({
          ...prev,
          skills: [...prev.skills, addedSkill]
        }));
      }
      
      setNewSkill('');
      setShowAddSkill(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add skill');
    } finally {
      setAddingSkill(false);
    }
  };

  const handleSave = async () => {
    if (form.skills.length === 0) {
      setError('Please select at least one skill');
      return;
    }
    if (!form.hourlyRate || Number(form.hourlyRate) <= 0) {
      setError('Please enter a valid hourly rate.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put('/providers/me', {
        skills: form.skills,
        isRemote: form.isRemote,
        hourlyRate: Number(form.hourlyRate),
        currency: form.currency,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p>Loading skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-sm font-black mx-auto mb-4">AI</div>
          <h1 className="text-2xl font-bold">Set up your provider profile</h1>
          <p className="text-white/40 text-sm mt-1">This is how clients will find you</p>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-all ${n <= step ? 'bg-indigo-500' : 'bg-white/10'}`} />
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300 mb-4">
            {error}
          </div>
        )}

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8">
          {step === 1 && (
            <div>
              <h2 className="font-bold text-lg mb-1">What services do you offer?</h2>
              <p className="text-white/40 text-sm mb-5">Select all that apply. You can add custom services too!</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {skillOptions.map(skill => (
                  <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      form.skills.includes(skill)
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                    }`}>
                    {skill}
                  </button>
                ))}
              </div>

              {/* Add Custom Skill Section */}
              {!showAddSkill ? (
                <button
                  type="button"
                  onClick={() => setShowAddSkill(true)}
                  className="w-full py-2.5 px-3 rounded-lg border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/50 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-all"
                >
                  + Add a custom service
                </button>
              ) : (
                <div className="space-y-3 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-lg">
                  <input
                    type="text"
                    placeholder="e.g., Tax Consulting, Video Editing, etc."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={addingSkill || !newSkill.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium py-2 rounded-lg transition-all"
                    >
                      {addingSkill ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddSkill(false); setNewSkill(''); setError(''); }}
                      className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium py-2 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {form.skills.length > 0 && (
                <p className="text-xs text-white/40 mt-4">✓ Selected: {form.skills.join(', ')}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-bold text-lg mb-1">Where do you work?</h2>
              <p className="text-white/40 text-sm mb-5">In-person, remote, or both</p>
              <div className="space-y-3">
                {[
                  { remote: false, icon: '📍', label: 'In-person', desc: 'You travel to clients or meet at a location' },
                  { remote: true, icon: '💻', label: 'Remote only', desc: 'You work online — available anywhere' },
                ].map(opt => (
                  <button key={opt.label} type="button" onClick={() => setForm({ ...form, isRemote: opt.remote })}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      form.isRemote === opt.remote ? 'border-indigo-500/50 bg-indigo-600/10' : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}>
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="text-left">
                      <div className="font-semibold text-sm">{opt.label}</div>
                      <div className="text-white/40 text-xs">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-bold text-lg mb-1">Set your rate</h2>
              <p className="text-white/40 text-sm mb-5">How much do you charge per hour?</p>
              <div className="flex gap-3">
                <input type="number" placeholder="35" min="0"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                />
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all">
                  <option value="TND">TND</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <p className="text-xs text-white/30 mt-3">A competitive rate means more matches from clients.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 transition-all py-3 rounded-xl font-semibold text-sm">
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 1 && form.skills.length === 0}
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
