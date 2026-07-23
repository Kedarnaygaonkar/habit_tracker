import React, { useState } from "react";
import { Shield, Sparkles, LogIn, UserPlus, HelpCircle, Star, Zap } from "lucide-react";

interface LandingPageProps {
  onLoginSuccess: (token: string, user: { id: string; email?: string; name?: string; role: "parent" | "child"; avatar?: string }) => void;
}

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [role, setRole] = useState<"parent" | "child">("child");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [childLoginId, setChildLoginId] = useState("");
  const [childPassword, setChildPassword] = useState("");

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isRegister ? "/api/auth/register-parent" : "/api/auth/login-parent";
    const body = isRegister ? { email, password, familyName } : { email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      onLoginSuccess(data.token, {
        id: data.parent.id,
        email: data.parent.email,
        name: data.parent.familyName,
        role: "parent",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: childLoginId, password: childPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect credentials");
      }

      onLoginSuccess(data.token, {
        id: data.child.id,
        name: data.child.name,
        role: "child",
        avatar: data.child.avatar,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (type: "parent" | "leo" | "emma") => {
    setError("");
    if (type === "parent") {
      setRole("parent");
      setIsRegister(false);
      setEmail("parent@habitquest.com");
      setPassword("password123");
    } else if (type === "leo") {
      setRole("child");
      setChildLoginId("leo");
      setChildPassword("1234");
    } else if (type === "emma") {
      setRole("child");
      setChildLoginId("emma");
      setChildPassword("5678");
    }
  };

  return (
    <div id="landing-page" className="hero-bg min-h-screen flex flex-col items-center justify-center p-4 md:p-6 select-none relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Decorative floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Ambient glow orbs */}
        <div className="absolute top-[8%] left-[12%] w-64 h-64 rounded-full opacity-20 animate-spin-slow" style={{ background: 'radial-gradient(circle, rgba(108,61,224,0.6) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[15%] right-[10%] w-80 h-80 rounded-full opacity-15 animate-spin-slow" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.5) 0%, transparent 70%)', animationDirection: 'reverse', animationDuration: '16s' }} />
        <div className="absolute top-[40%] right-[5%] w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)' }} />

        {/* Floating emoji decorations */}
        <div className="absolute top-[12%] left-[8%] text-3xl opacity-20 animate-float-bob" style={{ animationDelay: '0s' }}>⚔️</div>
        <div className="absolute top-[20%] right-[12%] text-2xl opacity-25 animate-float-bob" style={{ animationDelay: '1.2s' }}>🏆</div>
        <div className="absolute bottom-[25%] left-[6%] text-3xl opacity-20 animate-float-bob" style={{ animationDelay: '2.1s' }}>🐉</div>
        <div className="absolute bottom-[18%] right-[8%] text-2xl opacity-25 animate-float-bob" style={{ animationDelay: '0.7s' }}>✨</div>
        <div className="absolute top-[55%] left-[4%] text-xl opacity-15 animate-float-bob" style={{ animationDelay: '1.8s' }}>🛡️</div>
        <div className="absolute top-[35%] right-[3%] text-xl opacity-20 animate-float-bob" style={{ animationDelay: '3s' }}>🔮</div>

        {/* Star grid pattern */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.4 + 0.1,
              animation: `glowPulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: Math.random() * 4 + 's',
            }}
          />
        ))}
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3 mb-6 animate-fade-in text-center relative z-10">

        {/* Logo Badge */}
        <div className="relative mb-1">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6C3DE0, #4f46e5)', boxShadow: '0 0 40px rgba(108,61,224,0.6), 0 12px 40px rgba(0,0,0,0.4)' }}>
            <span className="text-4xl relative z-10">🏰</span>
            <div className="absolute inset-0 shimmer-bg" />
          </div>
          {/* Orbiting star */}
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-xs shadow-lg animate-orbit" style={{ boxShadow: '0 0 10px rgba(251,191,36,0.8)' }}>
            <Star className="w-2.5 h-2.5 text-yellow-900 fill-yellow-900" />
          </div>
        </div>

        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <span className="gradient-text-purple">Habit</span>
            <span className="text-white">Quest</span>
          </h1>
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Turn chores into epic adventures ✨
          </p>
        </div>

        {/* Feature badge strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          {[
            { icon: '⚡', label: 'XP & Leveling' },
            { icon: '🪙', label: 'Earn Coins' },
            { icon: '🐾', label: 'Virtual Pet' },
            { icon: '🤖', label: 'AI Quests' },
          ].map(({ icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
              {icon} {label}
            </span>
          ))}
        </div>
      </div>

      {/* Main login card */}
      <div className="login-card w-full max-w-md p-6 md:p-8 animate-slide-up relative z-10">

        {/* Role Switcher */}
        <div className="flex rounded-2xl p-1 mb-6 relative" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            id="role-child-btn"
            onClick={() => { setRole("child"); setError(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
              role === "child" ? "role-pill-active" : "role-pill-inactive"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Child Portal
          </button>
          <button
            id="role-parent-btn"
            onClick={() => { setRole("parent"); setError(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
              role === "parent" ? "role-pill-active" : "role-pill-inactive"
            }`}
          >
            <Shield className="w-4 h-4" />
            Parent Portal
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl text-sm font-bold text-center animate-shake" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form Body */}
        <div className="transition-all duration-300">
          {role === "child" ? (
            <form id="child-login-form" onSubmit={handleChildSubmit} className="space-y-4 animate-fade-in">
              <div className="mb-2">
                <h3 className="text-xl font-black mb-1" style={{ color: 'white', fontFamily: "'Nunito', sans-serif" }}>
                  🎮 Ready for your Quest?
                </h3>
                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>Enter the Hero ID and password your parent gave you</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Hero ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. leo"
                  value={childLoginId}
                  onChange={(e) => setChildLoginId(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-bold outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', caretColor: '#a78bfa' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,61,224,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Secret Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={childPassword}
                  onChange={(e) => setChildPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-bold outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', caretColor: '#a78bfa' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,61,224,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-2 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6C3DE0, #4f46e5)', border: 'none', borderBottom: '3px solid #3730a3', boxShadow: '0 8px 28px rgba(108,61,224,0.5)', fontFamily: "'Nunito', sans-serif" }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(108,61,224,0.7)'; (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(108,61,224,0.5)'; (e.target as HTMLButtonElement).style.transform = 'none'; }}
              >
                <Zap className="w-5 h-5" />
                {loading ? "Entering World..." : "Begin Adventure! ⚔️"}
              </button>
            </form>
          ) : (
            <form id="parent-login-form" onSubmit={handleParentSubmit} className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-black text-white mb-0.5">🛡️ Parent Portal</h3>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>Manage your family's quest board</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsRegister(!isRegister); setError(""); }}
                  className="text-xs font-black px-3 py-1.5 rounded-xl transition-all"
                  style={{ color: '#a78bfa', background: 'rgba(108,61,224,0.15)', border: '1px solid rgba(108,61,224,0.3)' }}
                >
                  {isRegister ? "Sign In" : "Register"}
                </button>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Family Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smith, Miller"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-sm font-bold outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', caretColor: '#a78bfa' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,61,224,0.2)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-bold outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', caretColor: '#a78bfa' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,61,224,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-bold outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', caretColor: '#a78bfa' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,61,224,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-2 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6C3DE0, #4f46e5)', border: 'none', borderBottom: '3px solid #3730a3', boxShadow: '0 8px 28px rgba(108,61,224,0.5)' }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(108,61,224,0.7)'; (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(108,61,224,0.5)'; (e.target as HTMLButtonElement).style.transform = 'none'; }}
              >
                {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {loading ? "Syncing family..." : isRegister ? "Create Family Account" : "Sign In to Portal"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Quick Demo Section */}
      <div className="w-full max-w-md mt-4 animate-slide-up relative z-10" style={{ animationDelay: '0.15s' }}>
        <div className="login-card p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <HelpCircle className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
              Quick Demo Access
            </h4>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ background: 'rgba(108,61,224,0.25)', color: '#a78bfa', border: '1px solid rgba(108,61,224,0.3)' }}>
              Pre-seeded
            </span>
          </div>

          <div className="space-y-2">
            {/* Parent demo */}
            <div className="demo-card-glow flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(108,61,224,0.25)' }}>🛡️</div>
                <div>
                  <span className="text-sm font-black block" style={{ color: 'rgba(255,255,255,0.85)' }}>Parent Dashboard</span>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>parent@habitquest.com / password123</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fillQuickDemo("parent")}
                className="px-3.5 py-1.5 font-black rounded-xl text-xs uppercase cursor-pointer transition-all text-white"
                style={{ background: 'linear-gradient(135deg, #6C3DE0, #4f46e5)', boxShadow: '0 4px 12px rgba(108,61,224,0.4)' }}
              >
                Use
              </button>
            </div>

            {/* Children demos */}
            <div className="grid grid-cols-2 gap-2">
              <div className="demo-card-glow flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <span className="text-xs font-black block" style={{ color: 'rgba(255,255,255,0.85)' }}>Leo (Knight)</span>
                    <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>Code: 1234</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fillQuickDemo("leo")}
                  className="px-2.5 py-1.5 font-black rounded-lg text-xs uppercase cursor-pointer transition-all text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 3px 10px rgba(34,197,94,0.4)' }}
                >
                  Use
                </button>
              </div>

              <div className="demo-card-glow flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔮</span>
                  <div>
                    <span className="text-xs font-black block" style={{ color: 'rgba(255,255,255,0.85)' }}>Emma (Wizard)</span>
                    <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>Code: 5678</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fillQuickDemo("emma")}
                  className="px-2.5 py-1.5 font-black rounded-lg text-xs uppercase cursor-pointer transition-all shrink-0"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#1a0a00', boxShadow: '0 3px 10px rgba(251,191,36,0.4)' }}
                >
                  Use
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer caption */}
      <p className="mt-5 text-xs font-semibold relative z-10" style={{ color: 'rgba(255,255,255,0.2)' }}>
        HabitQuest © 2026 · Built with ❤️ by Kedar Naygaonkar
      </p>
    </div>
  );
}
