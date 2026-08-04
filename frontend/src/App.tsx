import React, { useState, useEffect, Suspense, lazy } from "react";
import LandingPage from "./components/LandingPage";

const ParentDashboard = lazy(() => import("./components/ParentDashboard"));
const ChildDashboard = lazy(() => import("./components/ChildDashboard"));

interface UserSession {
  token: string;
  id: string;
  email?: string;
  name?: string;
  role: "parent" | "child";
  avatar?: string;
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage if available
    const saved = localStorage.getItem("habitquest_session");
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (token: string, user: { id: string; email?: string; name?: string; role: "parent" | "child"; avatar?: string }) => {
    const newSession: UserSession = {
      token,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    };
    setSession(newSession);
    localStorage.setItem("habitquest_session", JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("habitquest_session");
  };

  if (loading) {
    return (
      <div className="app-bg min-h-screen flex flex-col items-center justify-center">
        <div className="text-6xl animate-float-bob mb-4">🏰</div>
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-wider text-blue-500">Loading HabitQuest...</p>
      </div>
    );
  }

  if (!session) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (session.role === "parent") {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <ParentDashboard 
          token={session.token}
          parent={{ id: session.id, name: session.name || "Administrator", email: session.email || "" }}
          onLogout={handleLogout} 
        />
      </Suspense>
    );
  }

  if (session.role === "child") {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-blue-50"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <ChildDashboard 
          token={session.token}
          child={{ id: session.id, name: session.name || "Hero", avatar: session.avatar || "avatar_knight" }}
          onLogout={handleLogout} 
        />
      </Suspense>
    );
  }

  return (
    <ChildDashboard
      token={session.token}
      childUser={{ id: session.id, name: session.name || "Hero", avatar: session.avatar || "avatar_knight" }}
      onLogout={handleLogout}
    />
  );
}
