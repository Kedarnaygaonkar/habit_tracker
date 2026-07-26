import React, { useState } from "react";

interface LandingPageProps {
  onLoginSuccess: (token: string, user: { id: string; email?: string; name?: string; role: "parent" | "child"; avatar?: string }) => void;
}

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [role, setRole] = useState<"parent" | "child">("child");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [childLoginId, setChildLoginId] = useState("");
  const [childPassword, setChildPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSuccessMsg("");
    setLoading(true);
    const url = isRegister ? "/api/auth/register-parent" : "/api/auth/login-parent";
    const body = isRegister ? { email, password, familyName } : { email, password };
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.requireOtp) {
        setOtpSent(true);
        setDevOtp(data.devOtp || "");
        return;
      }
      onLoginSuccess(data.token, { id: data.parent.id, email: data.parent.email, name: data.parent.familyName, role: "parent" });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code");
      setOtpSent(true);
      setDevOtp(data.devOtp || "");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp: otpCode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid verification code");
      onLoginSuccess(data.token, { id: data.parent.id, email: data.parent.email, name: data.parent.familyName, role: "parent" });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reset code");
      setOtpSent(true);
      setDevOtp(data.devOtp || "");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleResetPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp: otpCode, newPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setResetSuccessMsg(data.message || "Password reset successfully!");
      setIsForgotPassword(false);
      setOtpSent(false);
      setOtpCode("");
      setNewPassword("");
      setPassword("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login-child", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loginId: childLoginId, password: childPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Incorrect credentials");
      onLoginSuccess(data.token, { id: data.child.id, name: data.child.name, role: "child", avatar: data.child.avatar });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="app-bg min-h-screen flex flex-col items-center justify-center p-5 select-none">

      {/* Logo & Brand */}
      <div className="flex flex-col items-center gap-3 mb-8 animate-fade-in text-center">
        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-5xl shadow-xl">
          🏰
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-800">
            Habit<span className="text-blue-500">Quest</span>
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            Build Great Habits Every Day! ✨
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="card w-full max-w-sm p-6 animate-slide-up">

        {/* Role Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border-2 border-slate-200">
          <button
            onClick={() => { setRole("child"); setError(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 ${
              role === "child" ? "bg-white text-blue-600 shadow-md border border-blue-200" : "text-slate-400"
            }`}
          >
            👧 Child
          </button>
          <button
            onClick={() => { setRole("parent"); setError(""); }}
            className={`flex-1 py-3 text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 ${
              role === "parent" ? "bg-white text-purple-600 shadow-md border border-purple-200" : "text-slate-400"
            }`}
          >
            👨‍👩‍👧 Parent
          </button>
        </div>

        {/* Reset Success Message */}
        {resetSuccessMsg && (
          <div className="mb-4 p-3 rounded-xl text-sm font-bold text-center animate-bounce-in bg-emerald-50 border-2 border-emerald-200 text-emerald-700">
            ✅ {resetSuccessMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm font-bold text-center animate-shake bg-red-50 border-2 border-red-200 text-red-600">
            ⚠️ {error}
          </div>
        )}

        {/* Child Login */}
        {role === "child" ? (
          <form onSubmit={handleChildSubmit} className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <p className="text-3xl mb-2">🎮</p>
              <h3 className="text-xl font-black text-slate-800">Ready to Play?</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Enter your Hero ID and password</p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Hero ID</label>
              <input type="text" required placeholder="e.g. leo" value={childLoginId} onChange={(e) => setChildLoginId(e.target.value)} className="input text-lg" />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Password</label>
              <input type="password" required placeholder="••••" value={childPassword} onChange={(e) => setChildPassword(e.target.value)} className="input text-lg" />
            </div>

            <button type="submit" disabled={loading} className="btn btn-green w-full text-lg py-4 mt-2">
              {loading ? "Loading..." : "Let's Go! 🚀"}
            </button>
          </form>
        ) : isForgotPassword ? (
          /* Forgot Password */
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-black text-slate-800">🔑 Reset Password</h3>
              <button type="button" onClick={() => { setIsForgotPassword(false); setError(""); setOtpSent(false); setResetSuccessMsg(""); }} className="text-xs font-black px-3 py-1.5 rounded-lg text-slate-600 bg-slate-100 border border-slate-200">
                Back to Login
              </button>
            </div>

            {!otpSent ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 animate-fade-in">
                <p className="text-xs font-bold text-slate-500 mb-2">Enter your registered parent email address and we will send a 6-digit verification code to your inbox.</p>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
                  <input type="email" required placeholder="parent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
                </div>
                <button type="submit" disabled={loading} className="btn btn-purple w-full py-4 mt-2">
                  {loading ? "Sending Code..." : "Send Reset Code 📧"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordVerify} className="space-y-4 animate-fade-in">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center mb-2">
                  <p className="text-xs font-bold text-purple-700 mb-1">🔒 Reset Verification Code Sent</p>
                  <p className="text-[11px] text-slate-500 mb-2">We sent a 6-digit code to {email}</p>
                  {devOtp && (
                    <div className="bg-white border border-purple-200 rounded-lg py-1 px-2.5 inline-block shadow-sm">
                      <span className="text-[10px] uppercase font-black text-slate-400 mr-1.5">Demo Code:</span>
                      <span className="font-mono text-base font-black text-purple-600 tracking-wider">{devOtp}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Enter 6-Digit Code</label>
                    <button type="button" onClick={() => setOtpSent(false)} className="text-[10px] font-bold text-purple-600 hover:underline">Change Email</button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="input text-center text-2xl font-mono tracking-widest font-black uppercase py-3 mb-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                  />
                </div>

                <button type="submit" disabled={loading || otpCode.trim().length !== 6 || !newPassword} className="btn btn-purple w-full py-4 mt-2">
                  {loading ? "Resetting..." : "Reset Password & Save 🚀"}
                </button>

                <div className="text-center pt-1">
                  <button type="button" onClick={handleForgotPasswordSubmit} disabled={loading} className="text-xs font-bold text-slate-400 hover:text-purple-600">
                    Didn't receive code? Resend
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Parent Login */
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-black text-slate-800">🛡️ Parent Login</h3>
              <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); setOtpSent(false); }} className="text-xs font-black px-3 py-1.5 rounded-lg text-purple-600 bg-purple-50 border border-purple-200">
                {isRegister ? "Sign In" : "Register"}
              </button>
            </div>

            {!otpSent ? (
              <form onSubmit={handleParentSubmit} className="space-y-4 animate-fade-in">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Family Name</label>
                    <input type="text" required placeholder="e.g. Smith" value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="input" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Email</label>
                  <input type="email" required placeholder="parent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Password</label>
                    {!isRegister && (
                      <button type="button" onClick={() => { setIsForgotPassword(true); setError(""); setOtpSent(false); setResetSuccessMsg(""); }} className="text-[11px] font-bold text-purple-600 hover:underline">
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
                </div>

                <button type="submit" disabled={loading} className="btn btn-purple w-full py-4 mt-2">
                  {loading ? "Loading..." : isRegister ? "Create Account & Get Code 🔐" : "Sign In & Get Code 🔐"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center mb-2">
                  <p className="text-xs font-bold text-purple-700 mb-1">🔒 2-Step Verification required</p>
                  <p className="text-[11px] text-slate-500 mb-2">We sent a 6-digit code to {email}</p>
                  {devOtp && (
                    <div className="bg-white border border-purple-200 rounded-lg py-1 px-2.5 inline-block shadow-sm">
                      <span className="text-[10px] uppercase font-black text-slate-400 mr-1.5">Demo Code:</span>
                      <span className="font-mono text-base font-black text-purple-600 tracking-wider">{devOtp}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Enter 6-Digit Code</label>
                    <button type="button" onClick={() => setOtpSent(false)} className="text-[10px] font-bold text-purple-600 hover:underline">Back to {isRegister ? "Registration" : "Login"}</button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="input text-center text-2xl font-mono tracking-widest font-black uppercase py-3"
                  />
                </div>

                <button type="submit" disabled={loading || otpCode.trim().length !== 6} className="btn btn-purple w-full py-4 mt-2">
                  {loading ? "Verifying..." : `Verify & ${isRegister ? "Create Account" : "Sign In"} 🚀`}
                </button>

                <div className="text-center pt-1">
                  <button type="button" onClick={handleSendOtp} disabled={loading} className="text-xs font-bold text-slate-400 hover:text-purple-600">
                    Didn't receive code? Resend
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Demo Accounts */}
      <div className="card w-full max-w-sm p-4 mt-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 text-center">Quick Demo</p>
        <div className="flex gap-2">
          <button onClick={() => { setRole("parent"); setIsRegister(false); setOtpSent(false); setEmail("parent@habitquest.com"); setPassword("password123"); setError(""); }} className="flex-1 py-2.5 rounded-xl text-xs font-black bg-purple-50 text-purple-600 border-2 border-purple-200 active:translate-y-0.5 transition-transform">
            🛡️ Parent
          </button>
          <button onClick={() => { setRole("child"); setChildLoginId("leo"); setChildPassword("1234"); setError(""); }} className="flex-1 py-2.5 rounded-xl text-xs font-black bg-blue-50 text-blue-600 border-2 border-blue-200 active:translate-y-0.5 transition-transform">
            🛡️ Leo
          </button>
          <button onClick={() => { setRole("child"); setChildLoginId("emma"); setChildPassword("5678"); setError(""); }} className="flex-1 py-2.5 rounded-xl text-xs font-black bg-pink-50 text-pink-600 border-2 border-pink-200 active:translate-y-0.5 transition-transform">
            🔮 Emma
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs font-bold text-slate-300">
        HabitQuest © 2026 · By Kedar Naygaonkar
      </p>
    </div>
  );
}
