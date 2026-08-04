import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import PetGame from "./PetGame";
import { 
  Home, 
  CheckSquare, 
  Gift, 
  User, 
  Flame, 
  Award, 
  Trophy, 
  Star, 
  Zap, 
  Check, 
  Lock, 
  ChevronRight,
  Shield,
  Gamepad2,
  Heart,
  CheckCircle2,
  Camera,
  X,
  Users,
  Flag,
  Mail,
  Key,
  Rocket
} from "lucide-react";

interface ChildDashboardProps {
  token: string;
  childUser: { id: string; name: string; avatar: string };
  onLogout: () => void;
}

export default function ChildDashboard({ token, childUser, onLogout }: ChildDashboardProps) {
  const [data, setData] = useState<any | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "tasks" | "rewards" | "teams" | "profile">("home");
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [taskFilter, setTaskFilter] = useState<"today" | "all">("today");
  const [selectedTaskCalendar, setSelectedTaskCalendar] = useState<string | null>(null);
  const [badgeCatalog, setBadgeCatalog] = useState<any[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null); // for detail modal
  const [newBadgesPopup, setNewBadgesPopup] = useState<any[]>([]); // congrats popup
  const [showGame, setShowGame] = useState(false);

  const [joinTeamCode, setJoinTeamCode] = useState(() => {
    const urlCode = new URLSearchParams(window.location.search).get("team") || localStorage.getItem("pendingTeamCode");
    return urlCode ? urlCode.toUpperCase() : "";
  });
  const [joinTeamLoading, setJoinTeamLoading] = useState(false);

  const fetchDashboard = async (prevAchievements?: any[]) => {
    try {
      const [res, teamRes, catalogRes] = await Promise.all([
        fetch(`/api/children/${childUser.id}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/children/${childUser.id}/teams`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/badges/catalog`)
      ]);
      if (res.ok) {
        const newData = await res.json();
        // Check if new badges were earned since last fetch
        if (prevAchievements !== undefined) {
          const prevIds = new Set(prevAchievements.map((a: any) => a.id));
          const fresh = (newData.achievements || []).filter((a: any) => !prevIds.has(a.id));
          if (fresh.length > 0) {
            setNewBadgesPopup(fresh);
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#f59e0b','#10b981','#6366f1','#ec4899'] });
          }
        }
        setData(newData);
      }
      if (teamRes.ok) {
        const fetchedTeams = await teamRes.json();
        setTeams(fetchedTeams);
        setSelectedTeamId(prev => (prev && fetchedTeams.some((t: any) => t.id === prev)) ? prev : (fetchedTeams[0]?.id || null));
      }
      if (catalogRes.ok) setBadgeCatalog(await catalogRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboard(undefined);
    // Poll every 15s, passing current achievements so we can detect newly unlocked ones
    const interval = setInterval(() => {
      setData((prev: any) => {
        const prevAchs = prev?.achievements || [];
        fetchDashboard(prevAchs);
        return prev;
      });
    }, 15000);

    const pendingCode = new URLSearchParams(window.location.search).get("team") || localStorage.getItem("pendingTeamCode");
    if (pendingCode) {
      localStorage.removeItem("pendingTeamCode");
      setActiveTab("teams");
    }

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
        const result = await res.json();
        setSelectedQuest(null);
        setProofText("");
        setProofPhoto(null);

        // Show badge congrats popup if new badges were unlocked
        if (result.newlyUnlocked && result.newlyUnlocked.length > 0) {
          setNewBadgesPopup(result.newlyUnlocked);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#f59e0b','#10b981','#6366f1','#ec4899'] });
        } else {
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        }

        // Show level-up confetti if leveled up
        if (result.leveledUp) {
          setTimeout(() => confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 }, colors: ['#a855f7','#f59e0b','#10b981'] }), 400);
        }

        // Refresh dashboard — pass current achievements to detect any further newly unlocked ones
        const prevAchs = data?.achievements || [];
        fetchDashboard(prevAchs);
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

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinTeamCode) return;
    setJoinTeamLoading(true);
    try {
      const res = await fetch(`/api/children/${childUser.id}/join-team`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: joinTeamCode })
      });
      const resData = await res.json();
      if (res.ok) {
        confetti({ particleCount: 50, spread: 60 });
        setJoinTeamCode("");
        fetchDashboard();
      } else {
        alert(resData.error || "Failed to join team.");
      }
    } catch (e) { console.error(e); }
    finally { setJoinTeamLoading(false); }
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
      <div className="bg-sky-50 min-h-screen flex flex-col items-center justify-center">
        <div className="text-6xl animate-float-bob mb-4">🏰</div>
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-black uppercase tracking-wider text-blue-500">Loading...</p>
      </div>
    );
  }

  const { child, pet, quests, achievements, rewards } = data;
  const pendingQuests = quests.filter((q: any) => q.status === "pending");
  const completedQuests = quests.filter((q: any) => q.status === "completed" || q.status === "verified");
  const todayDone = completedQuests.length;
  const todayTotal = quests.length;
  const progressPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const xpProgressPct = child.levelProgress?.progressPercentage ?? 0; // Real XP-toward-next-level %
  const xpNeeded = child.levelProgress?.nextLevelXpNeeded ?? 200; // XP needed for next level
  const xpCurrent = child.levelProgress?.currentLevelXp ?? child.xp; // XP earned at current level
  const streak = child.streak || 0; // Real streak from DB

  const navItems = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "tasks" as const, icon: CheckSquare, label: "Tasks" },
    { id: "rewards" as const, icon: Gift, label: "Rewards" },
    { id: "teams" as const, icon: Users, label: "Teams" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  // Dynamic Background
  let bgColor = "bg-slate-50";
  if (activeTab === "rewards") bgColor = "bg-amber-50";
  else if (activeTab === "home") bgColor = "bg-sky-100";
  else if (activeTab === "teams" && teams.length === 0) bgColor = "bg-gradient-to-b from-[#cbf1fb] via-[#e2ebf8] to-[#e4e1fb]";
  else if (activeTab === "teams") bgColor = "bg-[#f0f6fa]";

  return (
    <div className={`min-h-screen pb-28 select-none relative overflow-hidden`}>
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source src="/child-bg.mp4" type="video/mp4" />
      </video>
      {/* Dynamic Tint Overlay */}
      <div className={`fixed inset-0 ${bgColor} opacity-80 backdrop-blur-[4px] z-0 transition-colors duration-500`}></div>

      {/* Main Content wrapper */}
      <div className="relative z-10 h-full">

      {/* Floating Background Circles for Empty Teams */}
      {activeTab === "teams" && teams.length === 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-10 left-4 w-12 h-12 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
          <div className="absolute top-32 right-10 w-16 h-16 bg-white rounded-full mix-blend-overlay filter blur-md opacity-60"></div>
          <div className="absolute top-20 right-20 w-8 h-8 bg-cyan-300 rounded-full mix-blend-multiply filter blur-md opacity-50"></div>
          <div className="absolute top-40 left-12 w-10 h-10 bg-purple-300 rounded-full mix-blend-multiply filter blur-lg opacity-60"></div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-lg mx-auto relative z-10">

        {/* ── HOME TAB ── */}
        {activeTab === "home" && (
          <div className="animate-fade-in px-4 pt-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm border border-slate-100">
                  {getAvatarEmoji(child.avatar)}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-purple-700 leading-tight">Hi, {child.name}!</h1>
                  <p className="text-xs font-bold text-slate-500 mt-1 max-w-[140px] leading-tight">Ready to collect stickers, streaks, and rewards?</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                 <div className="text-xs font-black">🪙</div>
                 <div className="font-black text-sm">{child.coins}</div>
              </div>
            </div>

            {/* Progress Dashboard */}
            <div className="bg-progress-gradient rounded-[32px] p-6 mb-8 shadow-lg shadow-blue-500/20 text-white">
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="font-black text-2xl leading-tight mb-1">Progress Dashboard</h2>
                   <p className="text-blue-100 text-sm font-bold">Your habits are growing beautifully</p>
                 </div>
                 <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black">Today</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white/10 backdrop-blur-md rounded-[20px] p-4 flex items-center gap-3">
                   <div className="relative w-12 h-12 shrink-0">
                     <svg viewBox="0 0 44 44" className="w-12 h-12 -rotate-90">
                       <circle cx="22" cy="22" r="18" strokeWidth="4" stroke="rgba(255,255,255,0.2)" fill="none" />
                       <circle cx="22" cy="22" r="18" strokeWidth="4" stroke="#c4b5fd" fill="none"
                         strokeDasharray={`${2 * Math.PI * 18}`}
                         strokeDashoffset={`${2 * Math.PI * 18 * (1 - xpProgressPct / 100)}`}
                         strokeLinecap="round" className="transition-all duration-700" />
                     </svg>
                     <span className="absolute inset-0 flex items-center justify-center font-black text-[10px]">{xpProgressPct}%</span>
                   </div>
                   <div>
                     <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">XP / Level</p>
                     <p className="font-black text-lg leading-tight">Level {child.level}</p>
                     <p className="text-[10px] text-blue-200 font-semibold">{child.xp} XP total • {xpCurrent}/{xpNeeded} this level</p>
                   </div>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md rounded-[20px] p-4 flex items-center gap-3">
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-500 shadow-inner"><Flame className="w-6 h-6 fill-current" /></div>
                   <div>
                     <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Streak</p>
                     <p className="font-black text-lg leading-tight">{streak} days</p>
                   </div>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md rounded-[20px] p-4 flex items-center gap-3">
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-amber-500 shadow-inner"><Award className="w-6 h-6 fill-current" /></div>
                   <div>
                      <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Badges</p>
                      <p className="font-black text-lg leading-tight">{achievements.length} earned</p>
                   </div>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md rounded-[20px] p-4 flex items-center gap-3">
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-inner"><Trophy className="w-6 h-6 fill-current" /></div>
                   <div>
                     <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Tasks Done</p>
                     <p className="font-black text-lg leading-tight">{todayDone} total</p>
                   </div>
                 </div>
              </div>
            </div>

            {/* Today's Tasks (Horizontal list) */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-4 px-1">
                <div>
                  <h3 className="font-black text-2xl text-slate-800">Today's Tasks</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">Tap a card when you finish a habit</p>
                </div>
                <span className="bg-white text-blue-600 font-black text-xs px-4 py-1.5 rounded-full shadow-sm">{quests.length} tasks</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 pt-1 px-1">
                {quests.map((q: any, i: number) => {
                  const isDone = q.status === 'completed' || q.status === 'verified';
                  const borderColors = ['bg-emerald-400', 'bg-blue-400', 'bg-orange-400', 'bg-purple-400'];
                  const color = borderColors[i % borderColors.length];
                  
                  return (
                    <div key={q.id} className="min-w-[220px] bg-white rounded-[28px] p-5 shadow-sm flex flex-col justify-between shrink-0 border border-slate-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => !isDone && setSelectedQuest(q)}>
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3 h-full">
                             <div className={`w-1.5 h-[60px] rounded-full ${color}`}></div>
                             <h4 className="font-black text-lg text-slate-800 leading-tight pr-2">{q.title}</h4>
                          </div>
                          {isDone ? (
                             <div className="bg-slate-100 text-slate-400 font-black text-[10px] w-10 h-10 rounded-full flex items-center justify-center shrink-0">Done</div>
                          ) : (
                             <div className="bg-amber-100 text-amber-700 font-black text-[10px] w-10 h-10 rounded-full flex items-center justify-center shrink-0 leading-none text-center">+{q.xp}<br/>XP</div>
                          )}
                       </div>
                       
                       <div className="flex items-center gap-3 mb-5 bg-slate-50 rounded-2xl p-2 border border-slate-100">
                          <div className="text-3xl">{q.icon || "📋"}</div>
                          <p className="text-xs font-bold text-slate-500 line-clamp-2">{q.description || "Daily routine"}</p>
                       </div>
                       
                       <div className="flex justify-between items-center">
                          <span className="bg-emerald-50 text-emerald-600 font-black text-[10px] px-3 py-1.5 rounded-full capitalize">{q.repetition}</span>
                          {isDone ? (
                             <button className="bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-full flex items-center gap-1 shadow-sm"><Check className="w-3.5 h-3.5" /> Done!</button>
                          ) : (
                             <button className="bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-full shadow-sm hover:bg-emerald-600 transition-colors">Mark Done</button>
                          )}
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* My Rewards (Horizontal list) */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-4 px-1">
                <div>
                  <h3 className="font-black text-2xl text-slate-800">My Rewards</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">Collect stickers and unlock surprises</p>
                </div>
                <span onClick={() => setActiveTab('rewards')} className="text-blue-600 font-black text-xs cursor-pointer flex items-center gap-0.5 px-2 py-1 bg-white rounded-full shadow-sm">See All <ChevronRight className="w-3.5 h-3.5"/></span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 pt-1 px-1">
                {rewards.map((r: any) => (
                  <div key={r.id} className="w-[140px] bg-white rounded-[24px] p-5 shadow-sm flex flex-col items-center text-center shrink-0 border border-slate-100">
                     <div className="w-20 h-20 mb-3 text-5xl flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100">{r.icon || "🎁"}</div>
                     <h4 className="font-black text-sm text-slate-800 leading-tight">{r.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TASKS TAB ── */}
        {activeTab === "tasks" && (
          <div className="animate-fade-in px-4 pt-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-slate-200/60 rounded-full flex items-center justify-center"><Zap className="w-7 h-7 text-slate-700" /></div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight">My Tasks</h1>
                <p className="text-xs font-bold text-slate-500 mt-1">Flat sticker habits for today</p>
              </div>
            </div>

            {/* Segmented Control */}
            <div className="segmented-control-child mb-8 w-full flex">
               <button onClick={() => setTaskFilter("today")} className={`flex-1 ${taskFilter === "today" ? "active" : "inactive"}`}>Today</button>
               <button onClick={() => setTaskFilter("all")} className={`flex-1 ${taskFilter === "all" ? "active" : "inactive"}`}>All Tasks</button>
            </div>

            <div className="space-y-4 mb-8">
               {quests.map((q: any, i: number) => {
                  const borderColors = ['bg-emerald-400', 'bg-blue-400', 'bg-orange-400', 'bg-purple-400'];
                  const borderColor = borderColors[i % borderColors.length];
                  const isDone = q.status === 'completed' || q.status === 'verified';
                  const isCalOpen = selectedTaskCalendar === q.id;

                  // Calendar helpers
                  const historyRecords = (data.history || []).filter((h: any) => h.questId === q.id);
                  const now2 = new Date(); const yr = now2.getFullYear(); const mo = now2.getMonth();
                  const daysInMo = new Date(yr, mo + 1, 0).getDate();
                  const calDays = Array.from({length: daysInMo}, (_, i2) => new Date(yr, mo, i2 + 1));
                  const wasCompleted = (d: Date) => {
                    return historyRecords.some((h: any) => {
                      if (!h.completedAt) return false;
                      const compDate = new Date(h.completedAt);
                      return compDate.getFullYear() === d.getFullYear() && 
                             compDate.getMonth() === d.getMonth() && 
                             compDate.getDate() === d.getDate();
                    });
                  };
                  
                  return (
                    <div key={q.id} className="bg-white rounded-[28px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
                       {/* Main row */}
                       <div className="p-4 flex items-center gap-4 cursor-pointer transition-transform hover:-translate-y-0.5"
                         onClick={() => {
                           if (isDone) { setSelectedTaskCalendar(isCalOpen ? null : q.id); }
                           else { setSelectedQuest(q); }
                         }}
                       >
                          <div className={`w-1.5 h-16 rounded-full ${borderColor} shrink-0`}></div>
                          <div className="w-[72px] h-[72px] bg-blue-50/50 rounded-[20px] flex items-center justify-center text-4xl shrink-0">{q.icon || "📋"}</div>
                          
                          <div className="flex-1 py-1 pr-2">
                             <div className="flex justify-between items-start mb-1">
                                <h3 className="font-black text-lg text-slate-800 leading-tight">{q.title}</h3>
                                {isDone ? (
                                   <span className="bg-emerald-100 text-emerald-600 font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Done!</span>
                                ) : (
                                   <span className="bg-amber-400 text-slate-900 font-black text-xs px-2.5 py-1 rounded-full shadow-sm">+{q.xp} XP</span>
                                )}
                             </div>
                             <p className="text-[11px] font-bold text-slate-400 mb-3 truncate">{q.description || "Daily morning routine"}</p>
                             
                             <div className="flex justify-between items-center">
                                <span className="bg-slate-100 text-slate-500 font-black text-[10px] px-3 py-1 rounded-full capitalize">{q.repetition}</span>
                                {isDone ? (
                                   <button className="bg-sky-50 text-sky-600 font-black text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5" onClick={e => {e.stopPropagation(); setSelectedTaskCalendar(isCalOpen ? null : q.id);}}>
                                     📅 {isCalOpen ? 'Hide' : 'History'}
                                   </button>
                                ) : (
                                   <button className="bg-emerald-500 text-white font-black text-xs px-4 py-1.5 rounded-full shadow-sm">Mark Done</button>
                                )}
                             </div>
                          </div>
                       </div>

                       {/* Calendar Panel */}
                       {isCalOpen && (
                         <div className="border-t border-slate-100 px-5 pb-5 pt-4 animate-fade-in bg-slate-50">
                           <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                             {now2.toLocaleString('default', {month:'long'})} {yr} — Completion History
                           </p>
                           <div className="grid grid-cols-7 gap-1.5 mb-3">
                             {['S','M','T','W','T','F','S'].map((d,i3) => <div key={i3} className="text-center text-[9px] font-black text-slate-400">{d}</div>)}
                             {Array.from({length: new Date(yr, mo, 1).getDay()}).map((_, e) => <div key={`e${e}`}/>)}
                             {calDays.map(d => {
                               const done = wasCompleted(d);
                               const isToday = d.toDateString() === new Date().toDateString();
                               return (
                                 <div key={d.getDate()} className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-black mx-auto transition-all
                                   ${done ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40 scale-105' :
                                     isToday ? 'bg-blue-100 text-blue-600 border-2 border-blue-300' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                   {done ? <Check className="w-4 h-4" /> : d.getDate()}
                                 </div>
                               );
                             })}
                           </div>
                           <div className="flex items-center gap-2 text-xs font-black text-slate-500 bg-white p-3 rounded-2xl border border-slate-100">
                             <span className="w-4 h-4 rounded-full bg-emerald-500 inline-block"></span>
                             Completed {historyRecords.length} time{historyRecords.length !== 1 ? 's' : ''} this month
                           </div>
                         </div>
                       )}
                    </div>
                  );
               })}
            </div>
            
            {/* Streak Card */}
            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center shrink-0"><Flame className="w-7 h-7 text-orange-500" /></div>
              <div>
                 <h4 className="font-black text-lg text-slate-800 mb-0.5">Streak on fire! 🔥</h4>
                 <p className="text-xs font-bold text-slate-500 leading-tight">You're on a <span className="text-orange-500 font-black">{streak} day</span> streak! Keep it going!</p>
              </div>
            </div>
          </div>
        )}

        {/* ── REWARDS TAB ── */}
        {activeTab === "rewards" && (
          <div className="animate-fade-in px-4 pt-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-md"><Trophy className="w-7 h-7 text-white" /></div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight">My Rewards</h1>
                <p className="text-xs font-bold text-slate-500 mt-1">Collect XP, unlock treats, and celebrate wins</p>
              </div>
            </div>
            
            {/* Big Gradient Banner */}
            <div className="bg-rewards-banner rounded-[32px] p-6 mb-8 shadow-lg shadow-purple-500/20 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shadow-inner"><Star className="w-7 h-7 text-white fill-current" /></div>
                 <div>
                    <h2 className="font-black text-2xl leading-tight mb-1">{child.coins} 🪙 Available</h2>
                    <p className="text-purple-100 text-xs font-bold">Keep going to unlock more rewards</p>
                 </div>
              </div>
              <div className="bg-white/20 backdrop-blur-md text-white font-black text-xs px-4 py-2 rounded-full border border-white/20">Level Up</div>
            </div>
            
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6 pb-2">
               <button className="bg-slate-900 text-white font-black px-6 py-2 rounded-full shrink-0 shadow-md shadow-slate-900/20">All</button>
               <button className="bg-white text-slate-600 font-black px-6 py-2 rounded-full shrink-0 shadow-sm border border-slate-100">Unlockable</button>
               <button className="bg-white text-slate-600 font-black px-6 py-2 rounded-full shrink-0 shadow-sm border border-slate-100">Redeemed</button>
               <button className="bg-white text-slate-600 font-black px-6 py-2 rounded-full shrink-0 shadow-sm border border-slate-100">Locked</button>
            </div>
            
            {/* Rewards Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
               {rewards.map((r: any) => {
                  const canAfford = child.coins >= r.coinsCost;
                  return (
                    <div key={r.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                       <div className="w-full flex justify-between items-start mb-3">
                          <div className="w-16 h-16 text-5xl bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">{r.icon || "🎁"}</div>
                          <span className="bg-amber-100 text-amber-700 font-black text-[10px] px-2.5 py-1 rounded-full shadow-sm">{r.coinsCost} 🪙</span>
                       </div>
                       
                       <h4 className="font-black text-base text-slate-800 leading-tight mb-1 w-full text-left">{r.title}</h4>
                       <p className="text-[10px] font-bold text-slate-400 mb-5 w-full text-left leading-tight line-clamp-2">{r.description || "Surprise reward box"}</p>
                       
                       {canAfford ? (
                         <button onClick={() => claimReward(r.id, r.coinsCost)} className="w-full bg-emerald-500 text-white font-black text-sm py-2.5 rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"><Star className="w-4 h-4" /> Redeem</button>
                       ) : (
                         <button className="w-full bg-slate-100 text-slate-400 font-black text-sm py-2.5 rounded-full flex items-center justify-center gap-1.5"><Lock className="w-4 h-4" /> Locked</button>
                       )}
                    </div>
                  );
               })}
            </div>
            
            {/* Encouragement Card */}
            <div className="bg-amber-100/60 rounded-[28px] p-5 border border-amber-200/50 flex items-center gap-4">
              <div className="text-4xl">🎉</div>
              <div>
                 <h4 className="font-black text-lg text-amber-900 mb-0.5">Keep going, hero!</h4>
                 <p className="text-xs font-bold text-amber-700/80 leading-tight">Every task brings you closer to your next surprise reward.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TEAMS TAB ── */}
        {activeTab === "teams" && (
          <div className="animate-fade-in w-full">
            {teams.length === 0 ? (
              <div className="px-5 pt-8">
                <div className="flex items-start gap-4 mb-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 border-[3px] border-white shrink-0">
                    <Flag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">Join a Team</h1>
                    <p className="text-sm font-bold text-slate-700/70 mt-1 leading-snug">Connect with friends and track peer progress</p>
                  </div>
                </div>

                {/* Illustration Card */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[40px] p-8 shadow-xl shadow-indigo-100/50 border border-white/80 flex justify-center items-center mb-8">
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 bg-slate-100 rounded-full border border-slate-200"></div>
                    <div className="absolute top-4 left-4 w-12 h-12 bg-yellow-300 rounded-full"></div>
                    <div className="absolute top-8 right-6 w-14 h-14 bg-purple-300 rounded-full"></div>
                    <div className="absolute bottom-6 left-10 w-8 h-8 bg-cyan-300 rounded-full"></div>
                    
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-purple-600 rounded-t-2xl z-10"></div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-32 h-10 bg-cyan-400 rounded-full z-10"></div>
                    <div className="absolute bottom-16 left-6 w-6 h-16 bg-purple-400 rounded-full -rotate-12 z-0"></div>
                    <div className="absolute bottom-16 right-6 w-6 h-16 bg-purple-400 rounded-full rotate-12 z-0"></div>
                    <div className="absolute bottom-6 left-4 w-24 h-6 bg-yellow-400 rounded-full -rotate-45 z-20"></div>
                    
                    <div className="absolute bottom-8 -right-4 bg-white rounded-xl shadow-lg border border-slate-100 p-3 rotate-12 z-30">
                      <Mail className="w-8 h-8 text-purple-500" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[36px] p-6 shadow-xl shadow-indigo-100/40 border border-white mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md shadow-blue-200 text-white shrink-0"><Key className="w-5 h-5"/></div>
                    <h3 className="font-black text-lg text-slate-800">Enter Invite Code</h3>
                  </div>
                  <p className="text-sm font-bold text-slate-500 leading-snug mb-6">Type the code your parent or teacher shared with you</p>
                  
                  <form onSubmit={handleJoinTeam}>
                    <div className="border-2 border-dashed border-indigo-200 bg-slate-50 rounded-2xl p-2 mb-6">
                      <input
                        type="text"
                        placeholder="• • • •  • • • •"
                        required
                        value={joinTeamCode}
                        onChange={e => setJoinTeamCode(e.target.value.toUpperCase())}
                        className="w-full bg-transparent text-center text-2xl font-black text-slate-800 tracking-[0.5em] outline-none placeholder:text-slate-300 uppercase py-3"
                      />
                    </div>
                    <button disabled={joinTeamLoading} type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black text-lg py-4 rounded-3xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95">
                      <Rocket className="w-5 h-5" /> {joinTeamLoading ? "..." : "Join Team"}
                    </button>
                  </form>
                </div>

                {/* Footer Card */}
                <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-5 shadow-lg shadow-indigo-50/50 border border-white flex gap-4 items-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0 shadow-sm"><Users className="w-6 h-6"/></div>
                  <div>
                    <h4 className="font-black text-sm text-slate-800 leading-tight mb-1">Ask your parent or teacher for your Invite Code</h4>
                    <p className="text-[10px] font-bold text-slate-500 leading-tight">They can help you join the right team and start earning XP together</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 pt-8">
                {/* Team Selector Dropdown */}
                {teams.length > 0 && (
                  <div className="mb-8">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2 ml-2">Select Team</label>
                    <div className="relative">
                      <select
                        value={selectedTeamId || teams[0]?.id || ""}
                        onChange={e => setSelectedTeamId(e.target.value)}
                        className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl pl-4 pr-10 py-3 font-black text-slate-800 outline-none focus:border-indigo-400 transition-all shadow-sm cursor-pointer"
                      >
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                         <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                )}

                {teams.filter(t => t.id === (selectedTeamId || teams[0]?.id)).map(team => (
                  <div key={team.id} className="mb-10">
                    <div className="bg-white rounded-[32px] p-5 flex items-center gap-4 shadow-sm border border-slate-100 mb-8 relative z-10">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-2xl flex items-center justify-center text-3xl shadow-md border-[3px] border-indigo-50 shrink-0 text-white">
                        {team.icon && team.icon !== "🏆" ? team.icon : <Users className="w-8 h-8" />}
                      </div>
                      <div className="flex-1">
                        <h2 className="font-black text-xl text-slate-900 leading-tight tracking-tight mb-0.5">{team.name}</h2>
                        <p className="text-[10px] font-bold text-slate-500 leading-tight">Team leaderboard and peer progress</p>
                      </div>
                      <div className="bg-amber-100/80 text-amber-700 text-[10px] font-black px-3 py-1.5 rounded-full whitespace-nowrap self-start mt-1 shrink-0">
                        {team.members.length} members
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-6 px-2">
                      <div className="w-10 h-10 bg-indigo-400 rounded-full flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-slate-900 leading-tight">Leaderboard</h3>
                        <p className="text-[10px] font-bold text-slate-500">Ranked by total XP</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {team.members.map((m: any, idx: number) => {
                        const isMe = m.id === childUser.id;
                        const rank = idx + 1;
                        
                        let cardStyle = "";
                        let rankElement = null;
                        let xpPillStyle = "";
                        let progressColor = "";

                        if (rank === 1) {
                          cardStyle = "bg-[#fff9e6] border-[#fce9b8]";
                          rankElement = (
                            <div className="relative">
                               <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider whitespace-nowrap shadow-sm z-10">CROWN</div>
                               <div className="w-16 h-16 rounded-full bg-[#3eb1eb] border-[4px] border-white flex items-center justify-center text-3xl shadow-md relative z-0">
                                  {getAvatarEmoji(m.avatar)}
                               </div>
                            </div>
                          );
                          xpPillStyle = "bg-white text-amber-600 border-[#fce9b8]";
                          progressColor = "bg-amber-500";
                        } else if (rank === 2) {
                          cardStyle = "bg-[#eaf7ff] border-[#cce8ff]";
                          rankElement = (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-black text-sm shadow-sm">{rank}</div>
                              <div className="w-12 h-12 rounded-full bg-[#00c5bc] border-[3px] border-white flex items-center justify-center text-xl shadow-sm">
                                 {getAvatarEmoji(m.avatar)}
                              </div>
                            </div>
                          );
                          xpPillStyle = "bg-[#d9f1ff] text-[#007cc0] border-transparent";
                          progressColor = "bg-[#00a3ff]";
                        } else if (isMe) {
                          cardStyle = "bg-[#fffae8] border-[#ffecaa]";
                          rankElement = (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white font-black text-sm shadow-sm">{rank}</div>
                              <div className="relative">
                                <div className="absolute -top-2 -right-3 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider shadow-sm z-10">YOU</div>
                                <div className="w-12 h-12 rounded-full bg-[#c284f9] border-[3px] border-white flex items-center justify-center text-xl shadow-sm relative z-0">
                                   {getAvatarEmoji(m.avatar)}
                                </div>
                              </div>
                            </div>
                          );
                          xpPillStyle = "bg-[#ffe082] text-amber-800 border-transparent";
                          progressColor = "bg-[#ffc107]";
                        } else {
                          cardStyle = "bg-white border-slate-100";
                          rankElement = (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm">{rank}</div>
                              <div className="w-12 h-12 rounded-full bg-[#70c970] border-[3px] border-white flex items-center justify-center text-xl shadow-sm">
                                 {getAvatarEmoji(m.avatar)}
                              </div>
                            </div>
                          );
                          xpPillStyle = "bg-slate-100 text-slate-800 border-transparent";
                          progressColor = rank % 2 === 0 ? "bg-[#ff7a00]" : "bg-[#00d084]";
                        }

                        const maxXP = Math.max(...team.members.map((mem:any) => mem.xp));
                        const progressWidth = Math.max(10, Math.round((m.xp / (maxXP || 1)) * 100));

                        return (
                          <div key={m.id} className={`rounded-[32px] p-4 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 ${cardStyle} relative overflow-hidden transition-transform active:scale-95`}>
                            <div className="flex items-center justify-between mb-3 w-full">
                              <div className="flex items-center gap-4">
                                {rankElement}
                                <div>
                                  <h4 className="font-black text-lg text-slate-900 leading-tight tracking-tight">{m.name}</h4>
                                  {rank === 1 ? (
                                    <div className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mt-1">1st Place</div>
                                  ) : (
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5 max-w-[120px] leading-tight line-clamp-1">{isMe ? "Your current ranking" : rank === 2 ? "Consistent streak builder" : rank === 3 ? "Fast task finisher" : "Steady progress"}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className={`px-4 py-2 rounded-full border shadow-sm flex items-center justify-center whitespace-nowrap shrink-0 ${xpPillStyle}`}>
                                <span className="font-black text-sm">{m.xp.toLocaleString()} XP</span>
                              </div>
                            </div>
                            
                            <div className="w-full pl-[5.5rem] pr-2">
                              <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${progressWidth}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Join Another Team Section */}
                <div className="bg-white rounded-[36px] p-6 shadow-xl shadow-indigo-100/40 border border-slate-100 mb-6 mt-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md shadow-blue-200 text-white shrink-0"><Key className="w-5 h-5"/></div>
                    <h3 className="font-black text-lg text-slate-800">Join Another Team</h3>
                  </div>
                  <p className="text-sm font-bold text-slate-500 leading-snug mb-6">Type the invite code to join a new team.</p>
                  
                  <form onSubmit={handleJoinTeam}>
                    <div className="border-2 border-dashed border-indigo-200 bg-slate-50 rounded-2xl p-2 mb-6">
                      <input
                        type="text"
                        placeholder="• • • •  • • • •"
                        required
                        value={joinTeamCode}
                        onChange={e => setJoinTeamCode(e.target.value.toUpperCase())}
                        className="w-full bg-transparent text-center text-2xl font-black text-slate-800 tracking-[0.5em] outline-none placeholder:text-slate-300 uppercase py-3"
                      />
                    </div>
                    <button disabled={joinTeamLoading} type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black text-lg py-4 rounded-3xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95">
                      <Rocket className="w-5 h-5" /> {joinTeamLoading ? "..." : "Join Team"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB (Light Theme Adaptation) ── */}
        {activeTab === "profile" && (
          <div className="animate-fade-in px-4 pt-8">
            
            {/* Hero Section */}
            <div className="bg-white rounded-[36px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 mb-6 flex gap-4">
               
               {/* Left Box */}
               <div className="flex-1 flex flex-col items-center justify-center text-center bg-blue-50/70 rounded-[28px] p-5 border border-blue-100">
                  <div className="relative mb-4">
                     <div className="w-[84px] h-[84px] rounded-full border-[6px] border-blue-200 bg-white flex items-center justify-center text-5xl shadow-sm">
                        {getAvatarEmoji(child.avatar)}
                     </div>
                     <div className="absolute -top-1 -right-1 bg-amber-400 w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm"><Shield className="w-4 h-4 fill-current"/></div>
                  </div>
                  
                  <h2 className="text-2xl font-black text-slate-800 leading-tight mb-1">{child.name}</h2>
                  <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
                     Level {child.level} Hero
                  </div>
                  
                  <div className="mt-8 flex flex-col items-center w-full bg-white/50 p-4 rounded-2xl border border-blue-100/50">
                     <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase mb-2">XP PROGRESS</p>
                     <div className="flex items-center justify-between w-full">
                        <span className="font-black text-xl text-slate-800 leading-tight">{child.xp}/{(child.level+1)*100}<br/><span className="text-[10px] text-slate-400">XP</span></span>
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                           <Star className="w-6 h-6 text-white fill-current" />
                        </div>
                     </div>
                  </div>
               </div>
               
               {/* Right Column Stats */}
               <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-slate-50/80 rounded-[24px] p-4 border border-slate-100 flex-1 flex flex-col justify-center">
                     <div className="flex items-center gap-2 mb-1.5">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Streak</span>
                     </div>
                     <p className="font-black text-xl text-slate-800 leading-tight">{streak} <span className="text-xs text-slate-500">Days</span></p>
                  </div>
                  <div className="bg-slate-50/80 rounded-[24px] p-4 border border-slate-100 flex-1 flex flex-col justify-center">
                     <div className="flex items-center gap-2 mb-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Badges</span>
                     </div>
                      <p className="font-black text-xl text-slate-800 leading-tight">{achievements.length} <span className="text-xs text-slate-500">Earned</span></p>
                  </div>
                  <div className="bg-slate-50/80 rounded-[24px] p-4 border border-slate-100 flex-1 flex flex-col justify-center">
                     <div className="flex items-center gap-2 mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tasks</span>
                     </div>
                     <p className="font-black text-xl text-slate-800 leading-tight">{completedQuests.length} <span className="text-xs text-slate-500">Done</span></p>
                  </div>
               </div>
            </div>

            {/* My Pet Section */}
            <div className="bg-white rounded-[36px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 mb-6">
               <div className="flex justify-between items-start mb-5">
                  <div>
                     <h3 className="font-black text-2xl text-slate-800 mb-1">My Pet</h3>
                     <p className="text-xs font-bold text-slate-500 leading-tight">A cheerful companion that grows with your habits</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0"><Gamepad2 className="w-5 h-5 text-purple-600" /></div>
               </div>
               
               <div className="bg-slate-50 rounded-[28px] p-5 border border-slate-100">
                  <div className="flex gap-5 items-center mb-6">
                     <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-full border-[8px] border-emerald-400 flex items-center justify-center bg-white shadow-inner text-4xl">
                           {pet?.emoji || '🐲'}
                        </div>
                        <div className="absolute -top-1 -left-1 bg-amber-400 w-7 h-7 rounded-full flex items-center justify-center text-xs border-[3px] border-white shadow-sm">💎</div>
                        <div className="absolute -bottom-1 -right-1 bg-pink-400 w-7 h-7 rounded-full flex items-center justify-center text-white border-[3px] border-white shadow-sm"><Heart className="w-3.5 h-3.5 fill-current" /></div>
                     </div>
                     
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                           <h4 className="font-black text-2xl text-slate-800">{pet?.name || 'Buddy'}</h4>
                           <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                             pet?.status === 'happy' ? 'bg-emerald-100 text-emerald-700' :
                             pet?.status === 'excited' ? 'bg-purple-100 text-purple-700' :
                             pet?.status === 'sleepy' ? 'bg-blue-100 text-blue-700' :
                             'bg-orange-100 text-orange-700'
                           }`}>{pet?.status ? pet.status.charAt(0).toUpperCase() + pet.status.slice(1) : 'Happy'}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mb-4 leading-tight">Your companion is ready to play and learn.</p>
                        
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 mb-1.5 px-1">
                           <span>Energy</span>
                           <span>{pet?.happiness ?? 100}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                           <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pet?.happiness ?? 100}%` }}></div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex gap-3">
                     <button onClick={feedPet} className="flex-1 bg-orange-500 text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-transform"><span className="text-lg">🍖</span> Feed Pet</button>
                     <button onClick={() => setShowGame(true)} className="flex-1 bg-purple-600 text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:-translate-y-0.5 transition-transform"><Gamepad2 className="w-5 h-5" /> Play</button>
                  </div>
               </div>
            </div>

            {/* My Badges Section - Full Catalog */}
            <div className="bg-white rounded-[36px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
               <div className="flex justify-between items-start mb-2">
                  <div>
                     <h3 className="font-black text-2xl text-slate-800 mb-1">My Badges</h3>
                     <p className="text-xs font-bold text-slate-500 leading-tight">{achievements.length} earned — {badgeCatalog.length - achievements.length} locked</p>
                  </div>
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 text-amber-600" /></div>
               </div>

               {/* Earned Badges */}
               {achievements.length > 0 && (
                 <div className="mb-4">
                   <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-3 px-1">✅ Earned</p>
                   <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1 px-1">
                     {achievements.map((ach: any, i: number) => {
                       const catalogEntry = badgeCatalog.find((b: any) => b.title === ach.title);
                       const borderColors = ['border-amber-400','border-blue-400','border-emerald-400','border-purple-400','border-rose-400'];
                       return (
                         <button key={ach.id} onClick={() => setSelectedBadge({ ...catalogEntry, earned: true, unlockedAt: ach.unlockedAt })} className={`w-[92px] min-w-[92px] h-[116px] rounded-[28px] border-2 ${borderColors[i % borderColors.length]} bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center shadow-sm p-3 text-center transition-transform hover:scale-105 active:scale-95`}>
                           <div className="text-3xl mb-1.5">{catalogEntry?.emoji || '🎖️'}</div>
                           <p className="text-[10px] font-black text-slate-700 leading-tight">{ach.title}</p>
                           <span className="mt-1.5 text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">✓ EARNED</span>
                         </button>
                       );
                     })}
                   </div>
                 </div>
               )}

               {/* Locked / Available Badges */}
               <div>
                 <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 px-1">🔒 Available to Earn</p>
                 <div className="grid grid-cols-3 gap-3">
                   {badgeCatalog.filter((b: any) => !achievements.some((a: any) => a.title === b.title)).map((badge: any) => (
                     <button key={badge.id} onClick={() => setSelectedBadge({ ...badge, earned: false })} className="flex flex-col items-center justify-center bg-slate-50 border-2 border-slate-200 border-dashed rounded-[24px] p-3 text-center hover:bg-slate-100 transition-colors active:scale-95">
                       <div className="text-3xl mb-1.5 grayscale opacity-50">{badge.emoji}</div>
                       <p className="text-[10px] font-black text-slate-500 leading-tight line-clamp-2">{badge.title}</p>
                     </button>
                   ))}
                 </div>
               </div>
            </div>
            
            <div className="mt-8 mb-4">
              <button onClick={onLogout} className="w-full bg-slate-100 text-slate-500 font-black text-sm py-4 rounded-2xl hover:bg-slate-200 transition-colors">Log Out</button>
            </div>
          </div>
        )}

      </main>

      {/* ── BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 z-50 rounded-t-[32px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <div className="max-w-lg mx-auto flex justify-between items-center px-2">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} onClick={() => setActiveTab(item.id)} className="flex flex-col items-center gap-1.5 cursor-pointer">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/20 scale-110' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}>
                  <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-black transition-colors ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── MODALS ── */}
      {selectedQuest && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-slide-up relative">
            <button onClick={() => { setSelectedQuest(null); setProofText(""); setProofPhoto(null); }} className="absolute top-4 right-4 w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200"><X className="w-4 h-4" /></button>
            <div className="flex flex-col items-center text-center mb-6 pt-2">
              <div className="w-16 h-16 bg-blue-100 text-4xl rounded-2xl flex items-center justify-center mb-4">{selectedQuest.icon || "✨"}</div>
              <h2 className="text-2xl font-black text-slate-800 mb-1">{selectedQuest.title}</h2>
              <div className="bg-amber-100 text-amber-700 text-xs font-black px-3 py-1 rounded-full inline-block">+{selectedQuest.xp} XP</div>
            </div>
            
            <form onSubmit={handleQuestSubmit}>
              {selectedQuest.requireProof === "photo" && (
                <div className="mb-6">
                  {proofPhoto ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200">
                      <img src={proofPhoto} alt="Proof" className="w-full h-48 object-cover" />
                      <button type="button" onClick={() => setProofPhoto(null)} className="absolute top-2 right-2 bg-slate-900/50 text-white p-1.5 rounded-full"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setProofPhoto("https://via.placeholder.com/400x300?text=Mock+Photo+Proof")} className="w-full h-32 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-500 rounded-2xl flex flex-col items-center justify-center font-bold text-sm gap-2 hover:bg-blue-100 transition-colors">
                      <Camera className="w-8 h-8" />
                      Tap to take photo
                    </button>
                  )}
                </div>
              )}
              {selectedQuest.requireProof === "text" && (
                <div className="mb-6">
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none" rows={3} placeholder="Write a short note..." value={proofText} onChange={(e) => setProofText(e.target.value)} required></textarea>
                </div>
              )}
              
              <button disabled={claiming || (selectedQuest.requireProof === "photo" && !proofPhoto) || (selectedQuest.requireProof === "text" && !proofText)} type="submit" className="w-full bg-emerald-500 text-white font-black py-4 rounded-[20px] shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2">
                {claiming ? "Submitting..." : (
                  <>
                     <CheckSquare className="w-5 h-5" />
                     Submit Task
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedBadge(null)}>
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-slide-up relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedBadge(null)} className="absolute top-4 right-4 w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
            
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 ${selectedBadge.earned ? 'bg-amber-100 border-4 border-amber-400' : 'bg-slate-100 border-4 border-slate-200 grayscale opacity-60'}`}>
                {selectedBadge.emoji || '🎖️'}
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-1">{selectedBadge.title}</h2>
              <p className="text-sm font-bold text-slate-500 leading-snug px-4">{selectedBadge.description}</p>
            </div>

            <div className={`rounded-2xl p-4 mb-4 ${selectedBadge.earned ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'}`}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-1 ${selectedBadge.earned ? 'text-emerald-500' : 'text-blue-400'}">
                {selectedBadge.earned ? '✅ Requirement Met' : '🎯 Requirement'}
              </p>
              <p className="font-black text-slate-800">{selectedBadge.requirementText}</p>
              {selectedBadge.earned && selectedBadge.unlockedAt && (
                <p className="text-xs font-bold text-emerald-500 mt-1">Earned on {new Date(selectedBadge.unlockedAt).toLocaleDateString()}</p>
              )}
            </div>

            {!selectedBadge.earned && (
              <p className="text-center text-xs font-bold text-slate-400">Keep going! You can earn this badge! 💪</p>
            )}
          </div>
        </div>
      )}

      {/* Congrats Popup — shows when new badges are unlocked */}
      {newBadgesPopup.length > 0 && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center relative animate-slide-up">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Badge Unlocked!</h2>
            <p className="text-sm font-bold text-slate-500 mb-6">You just earned {newBadgesPopup.length > 1 ? `${newBadgesPopup.length} new badges` : 'a new badge'}!</p>
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {newBadgesPopup.map((b: any, i: number) => {
                const catalogEntry = badgeCatalog.find((c: any) => c.title === b.title);
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center text-3xl mb-1">
                      {catalogEntry?.emoji || '⭐'}
                    </div>
                    <p className="text-[10px] font-black text-slate-700">{b.title}</p>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setNewBadgesPopup([])} className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors">
              Awesome! 🎉
            </button>
          </div>
        </div>
      )}

      {showGame && (
        <PetGame 
          onClose={() => setShowGame(false)} 
          onWin={(score) => {
            setShowGame(false);
          }} 
        />
      )}

      </div>
    </div>
  );
}
