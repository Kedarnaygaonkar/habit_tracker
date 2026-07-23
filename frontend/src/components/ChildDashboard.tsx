import React, { useState, useEffect } from "react";
import { 
  Award, Flame, Trophy, Coins, Compass, Sparkles, CheckCircle, 
  Clock, X, Send, Camera, Shield, Heart, HelpCircle, LogOut, Bell
} from "lucide-react";
import confetti from "canvas-confetti";

interface ChildDashboardProps {
  token: string;
  childUser: { id: string; name: string; avatar: string };
  onLogout: () => void;
}

export default function ChildDashboard({ token, childUser, onLogout }: ChildDashboardProps) {
  const [data, setData] = useState<any | null>(null);
  const [activeMenu, setActiveMenu] = useState<"quests" | "pet" | "shop" | "badges">("quests");
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Sound Synthesizer helper using Web Audio API (completely native, zero dependencies!)
  const playQuestSound = (type: "success" | "feed" | "levelUp" | "click") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        // High ascending double-tone
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1, 0.05); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2, 0.05); // G5
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "feed") {
        // Playful crunch chew chew pop
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(293, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(392, ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.24);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "levelUp") {
        // Grand fanfare
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.1); // E4
        osc.frequency.setValueAtTime(392.00, ctx.currentTime + 0.2); // G4
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.3); // C5
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
        osc.stop(ctx.currentTime + 0.8);
      } else {
        // Gentle tick click
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      // Ignore audio constraints on browser
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`/api/children/${childUser.id}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      const dashboardData = await res.json();
      if (res.ok) {
        setData(dashboardData);
        // Check if level has increased compared to local state to trigger levelUp confetti
        if (data && dashboardData.child.level > data.child.level) {
          triggerLevelCelebration();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifs = async () => {
    try {
      const res = await fetch(`/api/notifications/${childUser.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const list = await res.json();
      if (res.ok) setNotifications(list);
    } catch (e) {}
  };

  useEffect(() => {
    fetchDashboard();
    fetchNotifs();
    // Poll for notifications or parent approvals
    const interval = setInterval(() => {
      fetchDashboard();
      fetchNotifs();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const triggerLevelCelebration = () => {
    playQuestSound("levelUp");
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  // Submit Quest Proof
  const handleQuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuest) return;

    setClaiming(true);
    const proof = selectedQuest.requireProof === "photo" ? (proofPhoto || "data:image/png;base64,mockphoto") : proofText;

    try {
      const res = await fetch(`/api/children/${childUser.id}/quests/${selectedQuest.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proofData: proof })
      });

      if (res.ok) {
        playQuestSound("success");
        confetti({ particleCount: 50, spread: 50 });
        setSelectedQuest(null);
        setProofText("");
        setProofPhoto(null);
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  // Feed Pet
  const feedPet = async () => {
    if (!data || data.child.coins < 10) {
      alert("You need 10 Coins to buy pet snacks! Complete more quests first! 🍪");
      return;
    }

    try {
      const res = await fetch(`/api/children/${childUser.id}/feed-pet`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const resData = await res.json();
      if (res.ok) {
        playQuestSound("feed");
        // Happy bounce animation trigger
        const petEl = document.getElementById("virtual-pet-visual");
        if (petEl) {
          petEl.classList.add("animate-bounce");
          setTimeout(() => petEl.classList.remove("animate-bounce"), 1000);
        }

        confetti({
          particleCount: 40,
          colors: ["#f43f5e", "#ec4899", "#fda4af"],
          spread: 40
        });

        if (resData.petLeveledUp) {
          triggerLevelCelebration();
        }

        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Buy Reward from store
  const claimReward = async (rewardId: string, cost: number) => {
    if (!data || data.child.coins < cost) {
      alert("Not enough coins! Go complete some quests to earn coins first! 🪙");
      return;
    }

    try {
      const res = await fetch(`/api/children/${childUser.id}/rewards/${rewardId}/claim`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        playQuestSound("success");
        alert("🎁 Reward claimed! Sent approval request to your Parent. Once approved, you can enjoy it!");
        fetchDashboard();
      }
    } catch (e) {}
  };

  // Read notification
  const markNotifRead = async (notifId: string) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      fetchNotifs();
    } catch (e) {}
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen child-bg flex flex-col items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl animate-float-bob" style={{ background: 'linear-gradient(135deg, rgba(108,61,224,0.4), rgba(99,102,241,0.3))', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 0 30px rgba(108,61,224,0.4)' }}>
            🏰
          </div>
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>Loading Quest Map...</p>
            <div className="mt-3 flex gap-1 justify-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { child, pet, quests, achievements, rewards } = data;

  // Avatar lookup
  const getAvatarEmoji = (key: string) => {
    switch(key) {
      case "avatar_knight": return "🛡️";
      case "avatar_wizard": return "🔮";
      case "avatar_ninja": return "🥷";
      case "avatar_ranger": return "🏹";
      case "avatar_unicorn": return "🦄";
      default: return "👤";
    }
  };

  const getAvatarTitle = (key: string) => {
    switch(key) {
      case "avatar_knight": return "Noble Knight";
      case "avatar_wizard": return "Spellcaster Wizard";
      case "avatar_ninja": return "Shadow Ninja";
      case "avatar_ranger": return "Nature Ranger";
      case "avatar_unicorn": return "Unicorn Champion";
      default: return "Junior Hero";
    }
  };

  const getAvatarColor = (key: string) => {
    switch(key) {
      case "avatar_knight": return { glow: 'rgba(251,191,36,0.5)', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)' };
      case "avatar_wizard": return { glow: 'rgba(167,139,250,0.6)', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)' };
      case "avatar_ninja": return { glow: 'rgba(100,116,139,0.6)', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.4)' };
      case "avatar_ranger": return { glow: 'rgba(74,222,128,0.5)', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)' };
      case "avatar_unicorn": return { glow: 'rgba(236,72,153,0.5)', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)' };
      default: return { glow: 'rgba(99,102,241,0.5)', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)' };
    }
  };

  // Simulating Camera capture with pre-uploaded adorable mock canvas
  const simulateCameraCapture = () => {
    playQuestSound("click");
    // adorable pixel graphics mock base64 representation
    setProofPhoto("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    alert("📸 Photo captured successfully!");
  };

  const unreadNotifs = notifications.filter(n => !n.read);
  const avatarColors = getAvatarColor(child.avatar);

  const navItems = [
    { id: "quests" as const, icon: "⚔️", label: "Quests" },
    { id: "pet" as const, icon: "🐾", label: "My Pet" },
    { id: "shop" as const, icon: "🛒", label: "Shop" },
    { id: "badges" as const, icon: "🏆", label: "Trophies" },
  ];

  return (
    <div className="child-bg min-h-screen text-white flex flex-col select-none pb-24 relative" style={{ fontFamily: "'Nunito', sans-serif" }}>
      
      {/* Ambient background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 animate-spin-slow" style={{ background: 'radial-gradient(circle, rgba(108,61,224,0.8) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 animate-spin-slow" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.6) 0%, transparent 70%)', animationDirection: 'reverse', animationDuration: '20s' }} />
      </div>

      {/* ─── HEADER ─── */}
      <header className="child-header-glass sticky top-0 z-40 px-4 py-3 md:px-6 md:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          {/* Avatar + Level info */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl relative shrink-0"
              style={{ background: avatarColors.bg, border: `2px solid ${avatarColors.border}`, boxShadow: `0 0 18px ${avatarColors.glow}` }}
            >
              {getAvatarEmoji(child.avatar)}
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500 border-2 border-[#0f0a28] flex items-center justify-center text-[9px] font-black">
                {child.level}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">{child.name}</h2>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider" style={{ background: avatarColors.bg, border: `1px solid ${avatarColors.border}`, color: 'rgba(255,255,255,0.75)' }}>
                  {getAvatarTitle(child.avatar)}
                </span>
              </div>
              {/* XP Bar */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black" style={{ color: '#a78bfa' }}>Lvl {child.level}</span>
                <div className="xp-bar-track w-32 md:w-48">
                  <div className="xp-bar-fill" style={{ width: `${child.levelProgress.progressPercentage}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {child.levelProgress.currentLevelXp} / {child.levelProgress.nextLevelXpNeeded} XP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats chips + logout */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <span className="text-base leading-none">🪙</span>
              <span className="text-sm font-black" style={{ color: '#fbbf24' }}>{child.coins}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}>
              <Flame className="w-4 h-4" style={{ color: '#f87171' }} />
              <span className="text-sm font-black" style={{ color: '#f87171' }}>{child.streak}d</span>
            </div>
            {unreadNotifs.length > 0 && (
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)' }}>
                <Bell className="w-4 h-4 text-red-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">
                  {unreadNotifs.length}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-4xl mx-auto px-4 py-5 md:px-6 w-full flex-1 relative z-10">

        {/* AI Motivation Banner */}
        {data.motivationMessage && (
          <div className="mb-5 rounded-2xl p-4 relative overflow-hidden flex items-center gap-4 animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(108,61,224,0.4), rgba(99,102,241,0.3))', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 8px 32px rgba(108,61,224,0.25)' }}>
            <div className="absolute inset-0 shimmer-bg" />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 relative z-10" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              🔮
            </div>
            <div className="relative z-10">
              <span className="text-[9px] font-black uppercase tracking-widest block mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>✨ AI Spirit Guide</span>
              <p className="text-xs font-bold leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.85)' }}>"{data.motivationMessage}"</p>
            </div>
          </div>
        )}

        {/* Notification Banners */}
        {unreadNotifs.length > 0 && (
          <div className="mb-5 space-y-2">
            {unreadNotifs.map(n => (
              <div key={n.id} className="rounded-xl flex items-center justify-between px-4 py-3 text-xs font-bold animate-slide-up" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                <span className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" />
                  {n.message}
                </span>
                <button
                  type="button"
                  onClick={() => markNotifRead(n.id)}
                  className="p-1 rounded-lg transition cursor-pointer"
                  style={{ color: 'rgba(165,180,252,0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mobile stats bar */}
        <div className="sm:hidden flex gap-2 mb-5">
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <span>🪙</span>
            <span className="text-sm font-black" style={{ color: '#fbbf24' }}>{child.coins} coins</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <Flame className="w-4 h-4 text-red-400" />
            <span className="text-sm font-black" style={{ color: '#f87171' }}>{child.streak} day streak</span>
          </div>
        </div>

        {/* ── TAB: QUESTS ── */}
        {activeMenu === "quests" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-tight text-white">
                  <span>⚔️</span> Your Active Quest Map
                </h3>
                <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Conquer quests to earn Gold & level up your hero!</p>
              </div>
            </div>

            {quests.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Compass className="w-12 h-12 mx-auto stroke-2 mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                <p className="font-black text-sm uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>All quests completed!</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Ask your Parent to assign new adventures.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quests.map(q => {
                  const isPendingApproval = q.status === "completed";
                  const difficultyBorderColor = q.difficulty === "easy" ? '#4ade80' : q.difficulty === "medium" ? '#fbbf24' : '#f87171';
                  const difficultyGlow = q.difficulty === "easy" ? 'rgba(74,222,128,0.15)' : q.difficulty === "medium" ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)';
                  return (
                    <div
                      key={q.id}
                      className={`quest-card quest-card-${q.difficulty} flex flex-col justify-between ${isPendingApproval ? 'opacity-60' : ''}`}
                      style={{
                        background: `rgba(255,255,255,0.04)`,
                        borderLeft: `3px solid ${difficultyBorderColor}`,
                        padding: '1.25rem',
                      }}
                    >
                      {/* Quest header */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className={`badge-${q.difficulty}`}>{q.difficulty} Quest</span>
                          <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>{q.repetition}</span>
                        </div>

                        <h4 className="font-black text-sm text-white flex items-start gap-1.5 uppercase tracking-tight leading-snug">
                          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: difficultyBorderColor }} />
                          {q.adventureTitle || q.title}
                        </h4>
                        <p className="text-xs mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Goal: <span className="italic" style={{ color: 'rgba(255,255,255,0.55)' }}>"{q.title}"</span>
                        </p>
                      </div>

                      {/* Quest footer */}
                      <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>+{q.xp} XP</span>
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>+{q.coins} 🪙</span>
                        </div>

                        {isPendingApproval ? (
                          <span className="text-[10px] flex items-center gap-1 font-black uppercase px-3 py-1.5 rounded-xl" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                            <Clock className="w-3 h-3" /> Awaiting Parent
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setSelectedQuest(q); playQuestSound("click"); }}
                            className="quest-submit-btn"
                            style={{ padding: '0.5rem 1.125rem', fontSize: '0.7rem' }}
                          >
                            Conquer! ⚔️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quest Submission Modal */}
            {selectedQuest && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
                <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in relative" style={{ background: 'linear-gradient(160deg, #150d35, #0d1a30)', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedQuest(null); setProofText(""); setProofPhoto(null); }}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer transition"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="text-center space-y-2 mb-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3" style={{ background: 'linear-gradient(135deg, rgba(108,61,224,0.4), rgba(99,102,241,0.3))', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 0 24px rgba(108,61,224,0.4)' }}>
                      ⚔️
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">Claim Your Loot!</h3>
                    <p className="text-xs font-semibold italic" style={{ color: 'rgba(255,255,255,0.5)' }}>"{selectedQuest.adventureTitle}"</p>
                    <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Provide proof of completion to earn your rewards</p>
                  </div>

                  <form onSubmit={handleQuestSubmit} className="space-y-4">
                    {selectedQuest.requireProof === "text" && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Write a short note</label>
                        <textarea
                          required
                          placeholder="e.g. I read chapter 3 of the adventure book today!"
                          value={proofText}
                          onChange={(e) => setProofText(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-xs font-bold outline-none h-24 resize-none transition-all"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', caretColor: '#a78bfa' }}
                          onFocus={(e) => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,61,224,0.2)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>
                    )}

                    {selectedQuest.requireProof === "photo" && (
                      <div className="space-y-2 text-center">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-left mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Photo Proof</label>
                        {proofPhoto ? (
                          <div className="p-3 rounded-xl flex flex-col items-center gap-2" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#4ade80' }}>✓ Evidence Locked In!</span>
                            <button
                              type="button"
                              onClick={() => setProofPhoto(null)}
                              className="text-[10px] font-black cursor-pointer"
                              style={{ color: '#f87171' }}
                            >
                              Retake Photo
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={simulateCameraCapture}
                            className="w-full py-8 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; e.currentTarget.style.background = 'rgba(108,61,224,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                          >
                            <Camera className="w-8 h-8" style={{ color: '#a78bfa' }} />
                            <span className="text-xs font-black">Capture Camera Photo</span>
                          </button>
                        )}
                      </div>
                    )}

                    {selectedQuest.requireProof === "none" && (
                      <p className="text-center text-xs py-3 font-bold italic" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        No evidence needed. Just press the button! 🎯
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={claiming}
                      className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderBottom: '3px solid #15803d', boxShadow: '0 8px 28px rgba(34,197,94,0.4)' }}
                    >
                      <Send className="w-4 h-4" />
                      {claiming ? "Submitting..." : "Claim Gold & XP! 🪙"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: VIRTUAL PET ── */}
        {activeMenu === "pet" && (
          <div className="space-y-5 max-w-sm mx-auto text-center animate-fade-in">
            <div>
              <h3 className="text-lg font-black flex items-center justify-center gap-2 uppercase tracking-tight text-white">
                🐲 Virtual Companion
              </h3>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Keep your pet happy & level up together!</p>
            </div>

            <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
              {/* Status badge */}
              <div className="absolute top-4 right-4">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase border ${
                  pet.status === "happy" ? "text-green-400" :
                  pet.status === "excited" ? "text-blue-400 animate-pulse" : "text-yellow-400"
                }`} style={{
                  background: pet.status === "happy" ? 'rgba(74,222,128,0.1)' : pet.status === "excited" ? 'rgba(99,102,241,0.1)' : 'rgba(251,191,36,0.1)',
                  border: `1px solid ${pet.status === "happy" ? 'rgba(74,222,128,0.3)' : pet.status === "excited" ? 'rgba(99,102,241,0.3)' : 'rgba(251,191,36,0.3)'}`
                }}>
                  {pet.status === "happy" ? "😊 Happy" : pet.status === "excited" ? "🤩 Excited" : "😐 Neutral"}
                </span>
              </div>

              {/* Pet visual */}
              <div className="py-6 flex flex-col items-center">
                <Sparkles className="w-5 h-5 absolute top-12 left-8 animate-pulse text-purple-400" />
                <div
                  id="virtual-pet-visual"
                  className="w-32 h-32 text-7xl flex items-center justify-center animate-float-bob relative"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(108,61,224,0.5))' }}
                >
                  {child.avatar === "avatar_knight" ? "🐉" : "🐰"}
                </div>
                {/* Shadow */}
                <div className="w-16 h-2.5 rounded-full blur-sm mt-2 opacity-40 animate-pulse" style={{ background: 'rgba(108,61,224,0.6)' }} />
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="font-black text-white text-lg uppercase">{pet.name}</h4>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Level {pet.level} Guardian Companion</p>
                </div>

                {/* Happiness bar */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span>Happiness ({pet.happiness}%)</span>
                    <span>{pet.happiness > 50 ? '💚 Healthy' : '🍖 Hungry'}</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pet.happiness}%`, background: pet.happiness > 50 ? 'linear-gradient(90deg, #f87171, #ef4444)' : 'linear-gradient(90deg, #94a3b8, #64748b)' }}
                    />
                  </div>
                </div>

                {/* XP bar */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span>Pet XP ({pet.xp} / {pet.level * 100})</span>
                  </div>
                  <div className="xp-bar-track">
                    <div className="xp-bar-fill" style={{ width: `${(pet.xp / (pet.level * 100)) * 100}%` }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={feedPet}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all text-white"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', border: 'none', borderBottom: '3px solid #b45309', boxShadow: '0 8px 24px rgba(251,191,36,0.35)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(251,191,36,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(251,191,36,0.35)'; e.currentTarget.style.transform = 'none'; }}
                >
                  🍖 Feed Pet Snacks (10 🪙)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: REWARDS SHOP ── */}
        {activeMenu === "shop" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-tight text-white">
                🛒 Hero Rewards Shop
              </h3>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Trade your coins for real-life treats and activities!</p>
            </div>

            {rewards.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-black uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Shop is empty! Ask your parent to stock some rewards. 🛍️</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map(r => {
                  const isPending = r.status === "requested";
                  const isApproved = r.status === "approved";
                  const canAfford = child.coins >= r.coinsCost;
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl p-5 flex items-center justify-between transition-all"
                      style={{
                        background: isApproved ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isApproved ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      <div className="space-y-1 flex-1 mr-3">
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#a78bfa' }}>Reward</span>
                        <h4 className="font-black text-sm text-white">"{r.title}"</h4>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">🪙</span>
                          <span className="text-sm font-black" style={{ color: '#fbbf24' }}>{r.coinsCost} coins</span>
                          {!canAfford && !isPending && !isApproved && (
                            <span className="text-[10px] font-black ml-1" style={{ color: 'rgba(248,113,113,0.7)' }}>(Need {r.coinsCost - child.coins} more)</span>
                          )}
                        </div>
                      </div>

                      {isPending ? (
                        <span className="text-[10px] font-black px-3 py-2 rounded-xl uppercase tracking-wider animate-pulse" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                          ⏳ Pending
                        </span>
                      ) : isApproved ? (
                        <span className="text-[10px] font-black px-3 py-2 rounded-xl uppercase tracking-wider" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                          ✅ Enjoy!
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => claimReward(r.id, r.coinsCost)}
                          disabled={!canAfford}
                          className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-all disabled:opacity-30 text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', border: '1px solid rgba(251,191,36,0.3)', boxShadow: canAfford ? '0 4px 16px rgba(251,191,36,0.3)' : 'none' }}
                        >
                          Claim 🎁
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: BADGES ── */}
        {activeMenu === "badges" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-tight text-white">
                🏆 Trophy Room
              </h3>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Complete quests and streaks to unlock legendary badges!</p>
            </div>

            {achievements.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-black uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Keep completing quests to unlock your first badge! 🏅</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {achievements.map((ach: any) => (
                  <div
                    key={ach.id}
                    className="rounded-2xl p-4 text-center space-y-3 flex flex-col justify-between items-center relative overflow-hidden transition-all"
                    style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(251,191,36,0.15), 0 0 0 1px rgba(251,191,36,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* Shimmer overlay on hover */}
                    <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-bl-xl" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '0 0 1px 1px solid rgba(251,191,36,0.2)' }}>
                      Legendary
                    </div>

                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl mt-2 animate-float-bob" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 0 16px rgba(251,191,36,0.2)', animationDelay: `${Math.random() * 2}s` }}>
                      🏆
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-xs uppercase tracking-wide text-white">{ach.title}</h4>
                      <p className="text-[10px] font-semibold leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{ach.description}</p>
                    </div>

                    <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(ach.unlockedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── BOTTOM NAVIGATION ─── */}
      <footer className="fixed bottom-0 inset-x-0 child-footer-glass py-2 px-4 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setActiveMenu(item.id); playQuestSound("click"); }}
              className={`child-nav-btn ${activeMenu === item.id ? "active" : ""}`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
