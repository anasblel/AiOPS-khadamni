import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />
      <div className="fixed top-[-200px] left-[10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
      <div className="fixed bottom-[-200px] right-[5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)' }} />

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-black">AI</div>
          <span className="font-bold text-lg tracking-tight">AIOps <span className="text-indigo-400">Freelance</span></span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login" className="text-sm text-white/60 hover:text-white transition-colors">Sign in</Link>
          <Link to="/register" className="text-sm bg-indigo-600 hover:bg-indigo-500 transition-colors px-4 py-2 rounded-lg font-medium">Get Started</Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-8 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-indigo-300 mb-8 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI-Powered Service Matching
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
          Find the right pro<br />
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            in one sentence.
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-xl mx-auto mb-12 leading-relaxed">
          Type what you need in plain language. Our AI finds an available, matching provider — no browsing, no waiting, no ghosting.
        </p>
        <div className="flex items-center gap-4 justify-center flex-wrap">
          <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 transition-all px-8 py-3.5 rounded-xl font-semibold text-base shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5">Start for free</Link>
          <Link to="/login" className="bg-white/5 hover:bg-white/10 border border-white/10 transition-all px-8 py-3.5 rounded-xl font-semibold text-base hover:-translate-y-0.5">Sign in</Link>
        </div>

        <div className="mt-20 max-w-2xl mx-auto">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-left">
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-300 shrink-0">U</div>
              <div className="bg-indigo-600/20 border border-indigo-500/20 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-white/80">
                I need a plumber in Ariana tomorrow after 5 PM, budget 40 TND.
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <div className="bg-white/5 border border-white/10 rounded-xl rounded-tr-sm px-4 py-2.5 text-sm text-white/80 max-w-xs">
                Found <strong className="text-white">Karim</strong> — certified plumber 2km away, free at 5:30 PM, 35 TND/hr. Send booking request?
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs text-purple-300 shrink-0">AI</div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3 justify-center">
          {['No search. Just ask.', 'Real-time availability', 'Instant booking', 'Zero ghosting'].map(f => (
            <span key={f} className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50">{f}</span>
          ))}
        </div>
      </main>
    </div>
  );
}
