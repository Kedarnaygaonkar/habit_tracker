import React, { useState, useEffect } from "react";
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

  // THEME STATE
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("habitquest_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    localStorage.setItem("habitquest_theme", theme);
  }, [theme]);

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
    <div id="landing-page" className={`hero-bg min-h-screen flex flex-col items-center justify-center p-4 md:p-6 select-none relative overflow-hidden theme-${theme}`} style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Theme Toggle Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/50 border-2 border-white shadow-md hover:bg-white transition-colors cursor-pointer text-2xl"
          title="Toggle Theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>

      {/* Decorative floating particles - Dark theme only */}
      {theme === "dark" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Ambient glow orbs */}
          <div className="absolute top-[8%] left-[12%] w-64 h-64 rounded-full opacity-20 animate-spin-slow" style={{ background: 'radial-gradient(circle, rgba(108,61,224,0.6) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[15%] right-[10%] w-80 h-80 rounded-full opacity-15 animate-spin-slow" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.5) 0%, transparent 70%)', animationDirection: 'reverse', animationDuration: '16s' }} />
          <div className="absolute top-[40%] right-[5%] w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)' }} />

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
      )}

      {/* Floating emojis - Both themes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[12%] left-[8%] text-3xl opacity-30 animate-float-bob" style={{ animationDelay: '0s' }}>⚔️</div>
        <div className="absolute top-[20%] right-[12%] text-2xl opacity-40 animate-float-bob" style={{ animationDelay: '1.2s' }}>🏆</div>
        <div className="absolute bottom-[25%] left-[6%] text-3xl opacity-30 animate-float-bob" style={{ animationDelay: '2.1s' }}>🐉</div>
        <div className="absolute bottom-[18%] right-[8%] text-2xl opacity-40 animate-float-bob" style={{ animationDelay: '0.7s' }}>✨</div>
        <div className="absolute top-[55%] left-[4%] text-xl opacity-35 animate-float-bob" style={{ animationDelay: '1.8s' }}>🛡️</div>
        <div className="absolute top-[35%] right-[3%] text-xl opacity-30 animate-float-bob" style={{ animationDelay: '3s' }}>🔮</div>
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3 mb-6 animate-fade-in text-center relative z-10 pt-10">

        {/* Logo Badge */}
        <div className="relative mb-1">
          <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6C3DE0, #4f46e5)', boxShadow: '0 0 40px rgba(108,61,224,0.6), 0 12px 40px rgba(0,0,0,0.4)' }}>
            <span className="text-5xl relative z-10">🏰</span>
            <div className="absolute inset-0 shimmer-bg" />
          </div>
          {/* Orbiting star */}
          <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-sm shadow-lg animate-orbit" style={{ boxShadow: '0 0 10px rgba(251,191,36,0.8)' }}>
            <Star className="w-3.5 h-3.5 text-yellow-900 fill-yellow-900" />
          </div>
        </div>

        <div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <span className="gradient-text-purple">Habit</span>
            <span className="text-[var(--text-main)]">Quest</span>
          </h1>
          <p className="text-base font-bold text-[var(--text-muted)]">
            Turn chores into epic adventures ✨
          </p>
        </div>

        {/* Feature badge strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {[
            { icon: '⚡', label: 'XP & Leveling' },
            { icon: '🪙', label: 'Earn Coins' },
            { icon: '🐾', label: 'Virtual Pet' },
          ].map(({ icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[var(--bg-card)] text-[var(--text-main)] border-2 border-[var(--border-color)] shadow-sm">
              {icon} {label}
            </span>
          ))}
        </div>
      </div>

      {/* Main login card */}
      <div className="w-full max-w-md p-6 md:p-8 animate-slide-up relative z-10 bg-[var(--bg-card)] rounded-[2.5rem] border-4 border-[var(--border-color)] shadow-2xl">

        {/* Role Switcher */}
        <div className="flex rounded-2xl p-1 mb-6 bg-[var(--input-bg)] border-2 border-[var(--input-border)]">
          <button
            id="role-child-btn"
            onClick={() => { setRole("child"); setError(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
              role === "child" ? "bg-white text-blue-600 shadow-md border-2 border-blue-200" : "text-[var(--text-muted)]"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Child Portal
          </button>
          <button
            id="role-parent-btn"
            onClick={() => { setRole("parent"); setError(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
              role === "parent" ? "bg-white text-purple-600 shadow-md border-2 border-purple-200" : "text-[var(--text-muted)]"
            }`}
          >
            <Shield className="w-4 h-4" />
            Parent Portal
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl text-sm font-bold text-center animate-shake bg-red-100 border-2 border-red-300 text-red-600">
            ⚠️ {error}
          </div>
        )}

        {/* Form Body */}
        <div className="transition-all duration-300">
          {role === "child" ? (
            <form id="child-login-form" onSubmit={handleChildSubmit} className="space-y-5 animate-fade-in">
              <div className="mb-4 text-center">
                <h3 className="text-2xl font-black mb-1 text-[var(--text-main)]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  🎮 Ready for your Quest?
                </h3>
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2 text-[var(--text-main)]">Hero ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. leo"
                  value={childLoginId}
                  onChange={(e) => setChildLoginId(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl text-lg font-bold outline-none transition-all bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] focus:border-purple-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2 text-[var(--text-main)]">Secret Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={childPassword}
                  onChange={(e) => setChildPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl text-lg font-bold outline-none transition-all bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] focus:border-purple-400 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 mt-4 rounded-2xl font-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer text-white shadow-xl bg-gradient-to-br from-green-400 to-green-600 border-b-4 border-green-700 active:border-b-0 active:translate-y-1 hover:from-green-500 hover:to-green-600"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                <Zap className="w-6 h-6" />
                {loading ? "Entering World..." : "BEGIN ADVENTURE! ⚔️"}
              </button>
            </form>
          ) : (
            <form id="parent-login-form" onSubmit={handleParentSubmit} className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-black text-[var(--text-main)] mb-0.5">🛡️ Parent Portal</h3>
                  <p className="text-xs font-bold text-[var(--text-muted)]">Manage your family's quest board</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsRegister(!isRegister); setError(""); }}
                  className="text-xs font-black px-3 py-1.5 rounded-xl transition-all text-purple-600 bg-purple-100 border-2 border-purple-200 hover:bg-purple-200"
                >
                  {isRegister ? "Sign In" : "Register"}
                </button>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-2 text-[var(--text-main)]">Family Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smith"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-sm font-bold outline-none transition-all bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] focus:border-purple-400 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2 text-[var(--text-main)]">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-bold outline-none transition-all bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] focus:border-purple-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2 text-[var(--text-main)]">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-bold outline-none transition-all bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] focus:border-purple-400 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-2 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer text-white shadow-xl bg-gradient-to-br from-purple-500 to-indigo-600 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 hover:from-purple-600 hover:to-indigo-700"
              >
                {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {loading ? "Syncing family..." : isRegister ? "Create Family Account" : "Sign In to Portal"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Quick Demo Section (Stacked on Mobile) */}
      <div className="w-full max-w-md mt-6 animate-slide-up relative z-10" style={{ animationDelay: '0.15s' }}>
        <div className="bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-[2rem] p-5 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-[var(--text-muted)]">
              <HelpCircle className="w-4 h-4 text-purple-500" />
              Quick Demo Access
            </h4>
          </div>

          <div className="flex flex-col gap-3">
            {/* Parent demo */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--input-bg)] border-2 border-[var(--input-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-purple-100 border-2 border-purple-200">🛡️</div>
                <div>
                  <span className="text-sm font-black block text-[var(--text-main)]">Parent Dashboard</span>
                  <p className="text-xs font-bold text-[var(--text-muted)]">parent@habitquest.com / password123</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fillQuickDemo("parent")}
                className="px-4 py-2 font-black rounded-xl text-xs uppercase cursor-pointer transition-all text-white bg-purple-500 hover:bg-purple-600 border-b-2 border-purple-700 active:translate-y-1 active:border-b-0"
              >
                Use
              </button>
            </div>

            {/* Children demos */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--input-bg)] border-2 border-[var(--input-border)]">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🛡️</div>
                <div>
                  <span className="text-sm font-black block text-[var(--text-main)]">Leo (Knight)</span>
                  <p className="text-xs font-bold text-[var(--text-muted)]">Code: 1234</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fillQuickDemo("leo")}
                className="px-4 py-2 font-black rounded-xl text-xs uppercase cursor-pointer transition-all text-white bg-green-500 hover:bg-green-600 border-b-2 border-green-700 active:translate-y-1 active:border-b-0 shrink-0"
              >
                Use
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--input-bg)] border-2 border-[var(--input-border)]">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔮</div>
                <div>
                  <span className="text-sm font-black block text-[var(--text-main)]">Emma (Wizard)</span>
                  <p className="text-xs font-bold text-[var(--text-muted)]">Code: 5678</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fillQuickDemo("emma")}
                className="px-4 py-2 font-black rounded-xl text-xs uppercase cursor-pointer transition-all text-white bg-amber-500 hover:bg-amber-600 border-b-2 border-amber-700 active:translate-y-1 active:border-b-0 shrink-0"
              >
                Use
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer caption */}
      <p className="mt-8 mb-4 text-xs font-black relative z-10 text-[var(--text-muted)]">
        HabitQuest © 2026 · Built with ❤️ by Kedar Naygaonkar
      </p>
    </div>
  );
}
