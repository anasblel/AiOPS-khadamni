import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState(null);
  const [googleCredential, setGoogleCredential] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { theme: 'dark', size: 'large', width: '100%', text: 'signin_with', shape: 'pill' }
        );
      } else {
        setTimeout(initGoogle, 300);
      }
    };
    initGoogle();
  }, [newUser]);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    setError('');
    const credential = response.credential;
    setGoogleCredential(credential);

    try {
      const { data } = await api.post('/auth/google', { credential });
      if (data.isNewUser) {
        setNewUser({ name: data.name, email: data.email });
      } else {
        login(data.user, data.accessToken, data.refreshToken);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignupWithRole = async (selectedRole) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google', {
        credential: googleCredential,
        role: selectedRole,
      });
      login(data.user, data.accessToken, data.refreshToken);
      if (selectedRole === 'provider') {
        navigate('/setup-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google registration failed.');
    } finally {
      setLoading(false);
      setNewUser(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />
      <div className="fixed top-[-150px] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-sm font-black">AI</div>
            <span className="font-bold text-xl tracking-tight">AIOps <span className="text-indigo-400">Freelance</span></span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-white/40 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300 mb-6">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all py-3 rounded-xl font-semibold text-sm mt-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Google Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative z-10 px-3 bg-[#161622] text-xs text-white/35 font-medium uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          {/* Google Sign-in Container */}
          <div className="w-full flex justify-center">
            <div id="google-signin-btn" className="w-full min-h-[44px]"></div>
          </div>
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          No account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">Create one</Link>
        </p>
      </div>

      {/* Role Picker Modal for Google Signup */}
      {newUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12121a] border border-white/10 rounded-3xl p-8 w-full max-w-md relative shadow-2xl shadow-black/80">
            <h3 className="font-extrabold text-xl text-white text-center mb-2">Complete your Registration</h3>
            <p className="text-sm text-white/40 text-center mb-6">
              Welcome, <span className="text-indigo-400 font-semibold">{newUser.name}</span>! Please select your role to finish signing up.
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleGoogleSignupWithRole('client')}
                className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 text-left transition-all group"
              >
                <div>
                  <span className="block font-bold text-sm text-white group-hover:text-indigo-300">I am a Client</span>
                  <span className="block text-xs text-white/40 mt-1">I want to hire AI and development specialists.</span>
                </div>
                <span className="text-2xl group-hover:scale-110 transition-transform">💼</span>
              </button>

              <button
                onClick={() => handleGoogleSignupWithRole('provider')}
                className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 text-left transition-all group"
              >
                <div>
                  <span className="block font-bold text-sm text-white group-hover:text-purple-300">I am a Provider</span>
                  <span className="block text-xs text-white/40 mt-1">I want to offer freelance and consulting services.</span>
                </div>
                <span className="text-2xl group-hover:scale-110 transition-transform">🚀</span>
              </button>
            </div>

            <button
              onClick={() => setNewUser(null)}
              className="w-full mt-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 py-3 rounded-xl text-sm font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
