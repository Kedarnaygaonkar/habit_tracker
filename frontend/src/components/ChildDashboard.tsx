import React, { useState, useEffect } from "react";
import { LogOut, X, Send, Camera } from "lucide-react";
import confetti from "canvas-confetti";

interface ChildDashboardProps {
  token: string;
  childUser: { id: string; name: string; avatar: string };
  onLogout: () => void;
}

export default function ChildDashboard({ token, childUser, onLogout }: ChildDashboardProps) {
  const [data, setData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "tasks" | "rewards" | "profile">("home");
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`/api/children/${childUser.id}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (res.ok) setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const getAvatarEmoji = (key: string) => {
    const map: Record<string, string> = { avatar_knight: "🛡️", avatar_wizard: "🔮", avatar_ninja: "🥷", avatar_ranger: "🏹", avatar_unicorn: "🦄" };
    return map[key] || "👤";
  };

  const handleQuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuest) return;
    setClaiming(true);
    const proof = selectedQuest.requireProof === "photo" ? (proofPhoto || "photo_captured") : proofText;
    try {
      const res = await fetch(`/api/children/${childUser.id}/quests/${selectedQuest.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proofData: proof })
      });
      if (res.ok) {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        setSelectedQuest(null);
        setProofText("");
        setProofPhoto(null);
        fetchDashboard();
      }
    } catch (e) { console.error(e); }
    finally { setClaiming(false); }
  };

  const feedPet = async () => {
    if (!data || data.child.coins < 10) { alert("You need 10 coins! 🪙"); return; }
    try {
      const res = await fetch(`/api/children/${childUser.id}/feed-pet`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        confetti({ particleCount: 30, colors: ["#f43f5e", "#ec4899", "#fda4af"], spread: 40 });
        fetchDashboard();
      }
    } catch (e) { console.error(e); }
  };

  const claimReward = async (rewardId: string, cost: number) => {
    if (!data || data.child.coins < cost) { alert("Not enough coins! 🪙"); return; }
    try {
      const res = await fetch(`/api/children/${childUser.id}/rewards/${rewardId}/claim`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        confetti({ particleCount: 40, spread: 50 });
        alert("🎁 Reward claimed! Waiting for parent approval.");
        fetchDashboard();
      }
    } catch (e) {}
  };

  if (loading || !data) {
    return (
      <div className="app-bg min-h-screen flex flex-col items-center justify-center">
        <div className="text-6xl animate-float-bob mb-4">🏰</div>
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-black uppercase tracking-wider text-blue-500">Loading...</p>
      </div>
    );
  }

  const { child, pet, quests, achievements, rewards } = data;
  const pendingQuests = quests.filter((q: any) => q.status === "pending");
  const completedQuests = quests.filter((q: any) => q.status === "completed");
  const todayDone = completedQuests.length;
  const todayTotal = quests.length;
  const progressPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const navItems = [
    { id: "home" as const, icon: "🏠", label: "Home" },
    { id: "tasks" as const, icon: "📋", label: "Tasks" },
    { id: "rewards" as const, icon: "⭐", label: "Rewards" },
    { id: "profile" as const, icon: "👤", label: "Profile" },
  ];

  const renderCalendar = () => {
    if (!data || !data.history) return null;
    
    const historyByDate: Record<string, number> = {};
    data.history.forEach((h: any) => {
      const dateStr = h.completedAt.slice(0, 10);
      historyByDate[dateStr] = (historyByDate[dateStr] || 0) + 1;
    });

    const days = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = historyByDate[dateStr] || 0;
      let activityClass = "";
      if (count >= 3) activityClass = "active-high";
      else if (count >= 2) activityClass = "active-med";
      else if (count >= 1) activityClass = "active-low";
      
      days.push(
        <div key={dateStr} className={`activity-cell ${activityClass}`} title={`${dateStr}: ${count} tasks`} />
      );
    }

    return (
      <div className="card p-5">
        <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3 text-center">Consistency Map</h4>
        <div className="activity-grid">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="app-bg min-h-screen pb-24 select-none">

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 header-bg backdrop-blur-md border-b-2 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-2xl shadow-sm">
              {getAvatarEmoji(child.avatar)}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 leading-tight">{child.name}</h2>
              <p className="text-xs font-bold text-slate-400">Level {child.level}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => document.documentElement.classList.toggle('dark')} className="theme-toggle mr-2" aria-label="Toggle Dark Mode"></button>
            <div className="pill pill-gold text-sm">⭐ {child.xp}</div>
            <div className="pill pill-blue text-sm">🪙 {child.coins}</div>
          </div>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main className="max-w-lg mx-auto px-4 py-5">

        {/* ── HOME TAB ── */}
        {activeTab === "home" && (
          <div className="space-y-5 animate-fade-in">
            {/* Greeting */}
            <div className="card card-blue p-6 text-center">
              <div className="text-4xl mb-3"><span className="sticker sticker-blue px-3 py-2">👋</span></div>
              <h3 className="text-2xl font-black text-slate-800">Hi {child.name}!</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">Let's build great habits today</p>
            </div>

            {/* Today's Progress */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-500">Today's Progress</h4>
                <span className="text-sm font-black text-blue-600">{todayDone}/{todayTotal}</span>
              </div>
              <div className="progress-track h-4 rounded-full">
                <div className="progress-fill-blue h-full rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              {todayDone === todayTotal && todayTotal > 0 && (
                <p className="text-center text-sm font-black text-green-600 mt-3">🎉 All tasks done! Amazing!</p>
              )}
            </div>

            {/* Calendar */}
            {renderCalendar()}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card flex flex-col items-center justify-center p-4 uiverse-tooltip-container">
                <img src="/stickers/fire.png" className="w-12 h-12 mb-2 drop-shadow-md hover:scale-110 transition-transform" alt="Streak" />
                <p className="text-xl font-black text-orange-500">{child.streak}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Day Streak</p>
                <div className="uiverse-tooltip">Keep playing every day to grow!</div>
              </div>
              <div className="card flex flex-col items-center justify-center p-4 uiverse-tooltip-container">
                <img src="/stickers/star.png" className="w-12 h-12 mb-2 drop-shadow-md hover:scale-110 transition-transform" alt="XP" />
                <p className="text-xl font-black text-amber-500">{child.xp}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total XP</p>
                <div className="uiverse-tooltip">Level up your pet with XP!</div>
              </div>
              <div className="card flex flex-col items-center justify-center p-4 uiverse-tooltip-container">
                <img src="/stickers/trophy.png" className="w-12 h-12 mb-2 drop-shadow-md hover:scale-110 transition-transform" alt="Badges" />
                <p className="text-xl font-black text-purple-500">{achievements.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Badges</p>
                <div className="uiverse-tooltip">Collect them all!</div>
              </div>
            </div>

            {/* Motivation */}
            {data.motivationMessage && (
              <div className="card card-yellow p-5 flex items-start gap-3">
                <span className="text-3xl shrink-0">💬</span>
                <div>
                  <p className="text-xs font-black uppercase text-amber-600 mb-1">Daily Tip</p>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">"{data.motivationMessage}"</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TASKS TAB ── */}
        {activeTab === "tasks" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">📋 My Tasks</h3>
              <span className="pill pill-blue">{todayDone}/{todayTotal} Done</span>
            </div>

            {quests.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-5xl mb-3">🎉</p>
                <p className="text-lg font-black text-slate-700">No tasks yet!</p>
                <p className="text-sm font-bold text-slate-400 mt-1">Ask your parent to add some.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quests.map((q: any) => {
                  const isDone = q.status === "completed";
                  const diffColor = q.difficulty === "easy" ? "border-l-green-400" : q.difficulty === "medium" ? "border-l-amber-400" : "border-l-red-400";

                  return (
                    <div
                      key={q.id}
                      className={`card flex items-center gap-4 border-l-4 ${diffColor} ${isDone ? "opacity-60" : ""}`}
                    >
                      {/* Checkbox */}
                      {isDone ? (
                        <div className="task-check checked" />
                      ) : (
                        <button
                          onClick={() => {
                            if (q.requireProof !== "none") {
                              setSelectedQuest(q);
                            } else {
                              // Direct submit for no-proof tasks
                              setSelectedQuest(q);
                              // Auto-submit
                              fetch(`/api/children/${childUser.id}/quests/${q.id}/submit`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ proofData: "completed" })
                              }).then(res => {
                                if (res.ok) {
                                  confetti({ particleCount: 40, spread: 40, origin: { y: 0.7 } });
                                  setSelectedQuest(null);
                                  fetchDashboard();
                                }
                              });
                            }
                          }}
                          className="task-check"
                        />
                      )}

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-base ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {q.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-400">+{q.xp} XP</span>
                          <span className="text-xs font-bold text-slate-400">+{q.coins} 🪙</span>
                        </div>
                      </div>

                      {/* Status */}
                      {isDone && (
                        <span className="pill pill-green text-xs">⏳ Pending</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quest Proof Modal */}
            {selectedQuest && selectedQuest.requireProof !== "none" && (
              <div className="modal-overlay">
                <div className="modal-card animate-scale-in text-center">
                  <button onClick={() => { setSelectedQuest(null); setProofText(""); setProofPhoto(null); }} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <X className="w-5 h-5" />
                  </button>

                  <p className="text-5xl mb-3">✅</p>
                  <h3 className="text-xl font-black text-slate-800 mb-1">Complete Task</h3>
                  <p className="text-sm font-bold text-slate-400 mb-5">{selectedQuest.title}</p>

                  <form onSubmit={handleQuestSubmit} className="space-y-4">
                    {selectedQuest.requireProof === "text" && (
                      <textarea required placeholder="Tell us how it went..." value={proofText} onChange={(e) => setProofText(e.target.value)} className="input h-24 resize-none" />
                    )}
                    {selectedQuest.requireProof === "photo" && (
                      proofPhoto ? (
                        <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-700 font-bold">
                          📸 Photo ready! <button type="button" onClick={() => setProofPhoto(null)} className="text-red-500 underline ml-2">Retake</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setProofPhoto("captured"); alert("📸 Photo captured!"); }} className="w-full py-8 rounded-xl bg-blue-50 border-2 border-dashed border-blue-200 text-blue-500 flex flex-col items-center gap-2">
                          <Camera className="w-8 h-8" />
                          <span className="font-black text-sm uppercase">Take Photo</span>
                        </button>
                      )
                    )}
                    <button type="submit" disabled={claiming} className="btn btn-green w-full py-4 text-lg">
                      {claiming ? "Sending..." : "Done! ✅"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REWARDS TAB ── */}
        {activeTab === "rewards" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">⭐ Rewards</h3>
              <div className="pill pill-blue text-sm">🪙 {child.coins}</div>
            </div>

            {rewards.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-5xl mb-3">🛍️</p>
                <p className="text-lg font-black text-slate-700">No rewards yet!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rewards.map((r: any) => {
                  const isPending = r.status === "requested";
                  const isApproved = r.status === "approved";
                  const canAfford = child.coins >= r.coinsCost;

                  return (
                    <div key={r.id} className="card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src="/stickers/gift.png" className="w-14 h-14 drop-shadow-md hover:scale-110 transition-transform" alt="Reward" />
                        <div>
                          <p className="font-black text-base text-slate-800">{r.title}</p>
                          <p className="text-sm font-bold text-amber-600">{r.coinsCost} 🪙</p>
                        </div>
                      </div>
                      {isPending ? (
                        <span className="pill pill-gold">⏳ Wait</span>
                      ) : isApproved ? (
                        <span className="pill pill-green">✅ Yay!</span>
                      ) : (
                        <button onClick={() => claimReward(r.id, r.coinsCost)} disabled={!canAfford} className="btn btn-blue py-2 px-4 text-sm">
                          Claim
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div className="space-y-5 animate-fade-in">
            {/* Profile Card */}
            <div className="card text-center p-6">
              <div className="w-20 h-20 rounded-3xl bg-blue-100 border-4 border-blue-200 flex items-center justify-center text-4xl mx-auto mb-3 shadow-md">
                {getAvatarEmoji(child.avatar)}
              </div>
              <h3 className="text-2xl font-black text-slate-800">{child.name}</h3>
              <p className="text-sm font-bold text-slate-400">Level {child.level} Hero</p>
              <div className="flex justify-center gap-2 mt-3">
                <span className="pill pill-gold">⭐ {child.xp} XP</span>
                <span className="pill pill-blue">🪙 {child.coins}</span>
                <span className="pill pill-red">🔥 {child.streak}d</span>
              </div>
            </div>

            {/* Pet */}
            <div className="card card-pink p-6 text-center">
              <div className="mb-4 animate-float-bob flex justify-center">
                <img src="/stickers/dragon.png" className="w-32 h-32 drop-shadow-lg" alt="Pet" />
              </div>
              <h4 className="text-lg font-black text-slate-800">{pet.name}</h4>
              <p className="text-xs font-bold text-slate-500 mb-3">Level {pet.level} Pet</p>

              <div className="mb-4">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>Happiness</span>
                  <span>{pet.happiness > 50 ? "🥰" : "🥺"} {pet.happiness}%</span>
                </div>
                <div className="progress-track">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-700" style={{ width: `${pet.happiness}%` }} />
                </div>
              </div>

              <button onClick={feedPet} className="btn btn-yellow w-full py-3">
                🍖 Feed Pet (10 🪙)
              </button>
            </div>

            {/* Badges */}
            {achievements.length > 0 && (
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">🏆 Badges</h4>
                <div className="grid grid-cols-3 gap-3">
                  {achievements.map((a: any) => (
                    <div key={a.id} className="card card-yellow flex flex-col items-center justify-center p-3">
                      <img src="/stickers/trophy.png" className="w-12 h-12 mb-2 drop-shadow-md hover:scale-110 transition-transform" alt="Badge" />
                      <p className="text-[10px] font-black text-slate-600 leading-tight">{a.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logout */}
            <button onClick={onLogout} className="btn btn-outline w-full text-red-500 border-red-200">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </main>

      {/* ─── BOTTOM NAV ─── */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-item ${activeTab === item.id ? "active" : ""}`}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
