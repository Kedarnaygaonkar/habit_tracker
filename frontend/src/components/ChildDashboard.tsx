import React, { useState, useEffect } from "react";
import { 
  Flame, Clock, X, Send, Camera, LogOut, Bell
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

  // THEME STATE
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("habitquest_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    localStorage.setItem("habitquest_theme", theme);
  }, [theme]);

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

  const markNotifRead = async (notifId: string) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      fetchNotifs();
    } catch (e) {}
  };

  if (loading || !data) {
    return (
      <div className={`min-h-screen child-bg flex flex-col items-center justify-center theme-${theme}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl animate-bounce bg-white shadow-xl">
            🏰
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-widest text-[var(--text-main)]">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  const { child, pet, quests, achievements, rewards } = data;

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

  const simulateCameraCapture = () => {
    playQuestSound("click");
    setProofPhoto("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    alert("📸 Photo captured successfully!");
  };

  const unreadNotifs = notifications.filter(n => !n.read);

  const navItems = [
    { id: "quests" as const, icon: "⚔️", label: "Quests" },
    { id: "pet" as const, icon: "🐾", label: "Pet" },
    { id: "shop" as const, icon: "🛒", label: "Shop" },
    { id: "badges" as const, icon: "🏆", label: "Badges" },
  ];

  return (
    <div className={`child-bg min-h-screen flex flex-col select-none pb-24 relative theme-${theme}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
      
      {/* Decorative background elements only show in dark mode */}
      {theme === "dark" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 animate-spin-slow" style={{ background: 'radial-gradient(circle, rgba(108,61,224,0.8) 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 animate-spin-slow" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.6) 0%, transparent 70%)', animationDirection: 'reverse', animationDuration: '20s' }} />
        </div>
      )}
      
      {/* ─── HEADER ─── */}
      <header className="child-header-glass sticky top-0 z-40 px-4 py-3 md:px-6 md:py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          {/* Avatar + Level info */}
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg border-4 border-white bg-blue-100 relative shrink-0"
            >
              {getAvatarEmoji(child.avatar)}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center text-xs font-black text-yellow-900 shadow-sm">
                {child.level}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black var(--text-main)">{child.name}</h2>
              {/* XP Bar */}
              <div className="flex items-center gap-2 mt-1">
                <div className="xp-bar-track w-28 md:w-48 bg-black/20 border-white/20 border-2 h-4">
                  <div className="xp-bar-fill" style={{ width: `${child.levelProgress.progressPercentage}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats chips + toggle + logout */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-100 border-2 border-yellow-300 shadow-sm">
              <span className="text-xl leading-none">🪙</span>
              <span className="text-lg font-black text-yellow-600">{child.coins}</span>
            </div>
            
            <button
              onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/50 border-2 border-white shadow-sm hover:bg-white transition-colors cursor-pointer text-2xl ml-2"
              title="Toggle Theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            <button
              onClick={onLogout}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-100 border-2 border-red-200 hover:bg-red-200 transition-colors cursor-pointer text-red-500 shadow-sm"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-4xl mx-auto px-4 py-5 md:px-6 w-full flex-1 relative z-10 text-[var(--text-main)]">

        {/* AI Motivation Banner */}
        {data.motivationMessage && (
          <div className="mb-6 rounded-3xl p-5 flex items-center gap-4 bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-[var(--card-shadow)] animate-fade-in">
            <div className="text-4xl shrink-0">🔮</div>
            <div>
              <p className="text-sm font-black uppercase text-[var(--text-muted)] mb-1">Magic Guide Says:</p>
              <p className="text-base md:text-lg font-bold leading-tight">"{data.motivationMessage}"</p>
            </div>
          </div>
        )}

        {/* Notification Banners */}
        {unreadNotifs.length > 0 && (
          <div className="mb-6 space-y-3">
            {unreadNotifs.map(n => (
              <div key={n.id} className="rounded-2xl flex items-center justify-between px-5 py-4 bg-blue-100 border-2 border-blue-200 text-blue-800 shadow-sm font-bold text-sm md:text-base animate-slide-up">
                <span className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-500" />
                  {n.message}
                </span>
                <button
                  onClick={() => markNotifRead(n.id)}
                  className="p-2 rounded-full hover:bg-blue-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: QUESTS ── */}
        {activeMenu === "quests" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-2xl md:text-3xl font-black flex items-center gap-3 uppercase tracking-tight">
              <span>⚔️</span> Epic Quests
            </h3>

            {quests.length === 0 ? (
              <div className="rounded-3xl p-12 text-center bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-[var(--card-shadow)]">
                <div className="text-6xl mb-4">🎉</div>
                <p className="font-black text-xl uppercase text-[var(--text-main)]">All Done!</p>
                <p className="text-lg text-[var(--text-muted)] mt-2 font-bold">You completed all your quests today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {quests.map((q: any) => {
                  const isPending = q.status === "completed";
                  const color = q.difficulty === "easy" ? "bg-green-100 text-green-700 border-green-300" 
                              : q.difficulty === "medium" ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                              : "bg-red-100 text-red-700 border-red-300";

                  return (
                    <div
                      key={q.id}
                      className={`rounded-3xl p-5 border-4 flex flex-col justify-between ${isPending ? 'opacity-60 bg-gray-100 border-gray-300' : 'bg-white border-[var(--border-color)]'} shadow-lg transition-transform hover:-translate-y-1`}
                    >
                      <div className="mb-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase mb-3 ${color}`}>
                          {q.difficulty} Quest
                        </span>
                        <h4 className="font-black text-xl text-gray-800 leading-tight">
                          {q.adventureTitle || q.title}
                        </h4>
                      </div>

                      <div className="pt-4 border-t-2 border-gray-100 flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className="font-black text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl border-2 border-purple-200">
                            +{q.xp} XP
                          </span>
                          <span className="font-black text-sm bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-xl border-2 border-yellow-200">
                            +{q.coins} 🪙
                          </span>
                        </div>

                        {isPending ? (
                          <span className="font-black text-xs uppercase bg-gray-200 text-gray-600 px-3 py-2 rounded-xl flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Wait
                          </span>
                        ) : (
                          <button
                            onClick={() => { setSelectedQuest(q); playQuestSound("click"); }}
                            className="bg-green-500 hover:bg-green-600 text-white font-black uppercase text-sm px-5 py-2.5 rounded-xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-md cursor-pointer"
                          >
                            DO IT!
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
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="w-full max-w-sm rounded-3xl p-6 bg-white shadow-2xl animate-scale-in relative border-4 border-gray-200 text-center">
                  <button
                    onClick={() => { setSelectedQuest(null); setProofText(""); setProofPhoto(null); }}
                    className="absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-gray-200 shadow-md text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-2xl font-black text-gray-800 uppercase mb-1">Claim Reward!</h3>
                  <p className="text-sm font-bold text-gray-500 mb-6">{selectedQuest.adventureTitle}</p>

                  <form onSubmit={handleQuestSubmit} className="space-y-4">
                    {selectedQuest.requireProof === "text" && (
                      <textarea
                        required
                        placeholder="Type a short note here..."
                        value={proofText}
                        onChange={(e) => setProofText(e.target.value)}
                        className="w-full p-4 rounded-2xl text-sm font-bold bg-gray-50 border-2 border-gray-200 text-gray-800 h-28 resize-none focus:border-purple-400 focus:outline-none"
                      />
                    )}

                    {selectedQuest.requireProof === "photo" && (
                      <div>
                        {proofPhoto ? (
                          <div className="p-4 rounded-2xl bg-green-100 border-2 border-green-300 text-green-700 font-black">
                            <p className="mb-2">📸 Photo Ready!</p>
                            <button type="button" onClick={() => setProofPhoto(null)} className="text-xs text-red-500 underline cursor-pointer">Retake</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={simulateCameraCapture}
                            className="w-full py-10 rounded-3xl bg-blue-50 border-4 border-dashed border-blue-200 text-blue-500 flex flex-col items-center gap-2 hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Camera className="w-10 h-10" />
                            <span className="font-black text-sm uppercase">Take Photo</span>
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={claiming}
                      className="w-full py-4 mt-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black text-xl uppercase border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      {claiming ? "Sending..." : "GIVE ME XP! 🌟"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: VIRTUAL PET ── */}
        {activeMenu === "pet" && (
          <div className="space-y-6 max-w-sm mx-auto text-center animate-fade-in">
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              🐾 My Pet
            </h3>

            <div className="rounded-[3rem] p-8 bg-[var(--bg-card)] border-4 border-[var(--border-color)] shadow-[var(--card-shadow)] relative">
              <div className="text-center mb-6">
                <h4 className="font-black text-2xl uppercase mb-1">{pet.name}</h4>
                <span className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-black border-2 border-purple-200">
                  Level {pet.level}
                </span>
              </div>

              {/* Huge Pet */}
              <div className="py-4 mb-6">
                <div id="virtual-pet-visual" className="text-9xl animate-float-bob filter drop-shadow-xl inline-block">
                  {child.avatar === "avatar_knight" ? "🐉" : "🐰"}
                </div>
              </div>

              {/* Simple Happiness */}
              <div className="bg-gray-100/50 p-4 rounded-3xl border-2 border-[var(--border-color)] mb-6">
                <div className="flex justify-between items-center mb-2 font-black text-sm uppercase text-[var(--text-main)]">
                  <span>Happy Meter</span>
                  <span>{pet.happiness > 50 ? '🥰' : '🥺'}</span>
                </div>
                <div className="w-full h-6 bg-gray-200 rounded-full border-2 border-gray-300 overflow-hidden">
                  <div 
                    className="h-full bg-pink-500 transition-all duration-1000" 
                    style={{ width: `${pet.happiness}%` }} 
                  />
                </div>
              </div>

              <button
                onClick={feedPet}
                className="w-full py-5 rounded-3xl bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black text-xl uppercase border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all shadow-xl cursor-pointer flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🍖</span> FEED (10 🪙)
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: REWARDS SHOP ── */}
        {activeMenu === "shop" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              🛒 Rewards Shop
            </h3>

            {rewards.length === 0 ? (
              <div className="rounded-3xl p-12 text-center bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-[var(--card-shadow)]">
                <div className="text-6xl mb-4">🛍️</div>
                <p className="font-black text-xl uppercase text-[var(--text-main)]">Shop Empty!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {rewards.map((r: any) => {
                  const isPending = r.status === "requested";
                  const isApproved = r.status === "approved";
                  const canAfford = child.coins >= r.coinsCost;

                  return (
                    <div
                      key={r.id}
                      className="rounded-3xl p-6 bg-[var(--bg-card)] border-4 border-[var(--border-color)] shadow-md flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-black text-lg md:text-xl text-[var(--text-main)] mb-2 leading-tight">
                          {r.title}
                        </h4>
                        <span className="font-black text-lg text-yellow-600 bg-yellow-100 px-3 py-1 rounded-xl border-2 border-yellow-200">
                          {r.coinsCost} 🪙
                        </span>
                      </div>

                      {isPending ? (
                        <span className="font-black text-sm uppercase bg-orange-100 text-orange-600 p-3 rounded-2xl border-2 border-orange-200 text-center">
                          WAIT ⏳
                        </span>
                      ) : isApproved ? (
                        <span className="font-black text-sm uppercase bg-green-100 text-green-600 p-3 rounded-2xl border-2 border-green-200 text-center">
                          YAY ✅
                        </span>
                      ) : (
                        <button
                          onClick={() => claimReward(r.id, r.coinsCost)}
                          disabled={!canAfford}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-black text-lg uppercase px-6 py-3 rounded-2xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          BUY
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
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              🏆 Badges
            </h3>

            {achievements.length === 0 ? (
              <div className="rounded-3xl p-12 text-center bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-[var(--card-shadow)]">
                <div className="text-6xl mb-4">🏅</div>
                <p className="font-black text-xl uppercase text-[var(--text-main)]">No Badges Yet</p>
                <p className="text-lg text-[var(--text-muted)] mt-2 font-bold">Keep playing to win trophies!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {achievements.map((ach: any) => (
                  <div
                    key={ach.id}
                    className="rounded-3xl p-6 text-center bg-[var(--bg-card)] border-4 border-yellow-300 shadow-lg relative overflow-hidden transition-transform hover:-translate-y-1"
                  >
                    <div className="text-5xl md:text-6xl mb-3 animate-float-bob" style={{ animationDelay: `${Math.random() * 2}s` }}>
                      🏆
                    </div>
                    <h4 className="font-black text-sm md:text-base uppercase text-[var(--text-main)] leading-tight">
                      {ach.title}
                    </h4>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── BOTTOM NAVIGATION ─── */}
      <footer className="fixed bottom-0 inset-x-0 child-footer-glass py-3 px-4 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between px-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveMenu(item.id); playQuestSound("click"); }}
              className={`child-nav-btn ${activeMenu === item.id ? "active" : ""} flex-1`}
            >
              <span className="text-3xl mb-1">{item.icon}</span>
              <span className="text-[10px] md:text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
