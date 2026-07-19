import React, { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import ParentDashboard from "./components/ParentDashboard";
import ChildDashboard from "./components/ChildDashboard";

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-indigo-300">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-wider">Restoring Family Portal...</p>
      </div>
    );
  }

  if (!session) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (session.role === "parent") {
    return (
      <ParentDashboard
        token={session.token}
        parent={{ id: session.id, name: session.name || "Administrator", email: session.email || "" }}
        onLogout={handleLogout}
      />
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

