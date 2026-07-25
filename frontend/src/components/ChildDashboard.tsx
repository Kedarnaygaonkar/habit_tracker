import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
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
  Users
} from "lucide-react";

interface ChildDashboardProps {
  token: string;
  childUser: { id: string; name: string; avatar: string };
  onLogout: () => void;
}

export default function ChildDashboard({ token, childUser, onLogout }: ChildDashboardProps) {
  const [data, setData] = useState<any | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"home" | "tasks" | "rewards" | "teams" | "profile">("home");
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [taskFilter, setTaskFilter] = useState<"today" | "all">("today");

  const [joinTeamCode, setJoinTeamCode] = useState("");
  const [joinTeamLoading, setJoinTeamLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      const [res, teamRes] = await Promise.all([
        fetch(`/api/children/${childUser.id}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/children/${childUser.id}/teams`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (res.ok) setData(await res.json());
      if (teamRes.ok) setTeams(await teamRes.json());
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
  const completedQuests = quests.filter((q: any) => q.status === "completed");
  const todayDone = completedQuests.length;
  const todayTotal = quests.length;
  const progressPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const streak = child.streak || 12; // Mock or actual streak

  const navItems = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "tasks" as const, icon: CheckSquare, label: "Tasks" },
    { id: "rewards" as const, icon: Gift, label: "Rewards" },
    { id: "teams" as const, icon: Users, label: "Teams" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  // Dynamic Background
  const bgColor = activeTab === "rewards" ? "bg-amber-50" : activeTab === "home" ? "bg-sky-100" : "bg-slate-50";

  return (
    <div className={`${bgColor} min-h-screen pb-28 select-none transition-colors duration-300`}>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-lg mx-auto">

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
                   <div className="w-12 h-12 rounded-full border-4 border-purple-300 flex items-center justify-center font-black text-xs">{progressPct}%</div>
                   <div>
                     <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">XP / Level</p>
                     <p className="font-black text-lg leading-tight">Level {child.level}</p>
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
                     <p className="font-black text-lg leading-tight">8 earned</p>
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
                  const isDone = q.status === 'completed';
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
                  const isDone = q.status === 'completed';
                  
                  return (
                    <div key={q.id} className="bg-white rounded-[28px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-4 cursor-pointer transition-transform hover:-translate-y-0.5" onClick={() => !isDone && setSelectedQuest(q)}>
                       <div className={`w-1.5 h-16 rounded-full ${borderColor}`}></div>
                       <div className="w-[72px] h-[72px] bg-blue-50/50 rounded-[20px] flex items-center justify-center text-4xl shrink-0">{q.icon || "📋"}</div>
                       
                       <div className="flex-1 py-1 pr-2">
                          <div className="flex justify-between items-start mb-1">
                             <h3 className="font-black text-lg text-slate-800 leading-tight">{q.title}</h3>
                             {isDone ? (
                                <span className="bg-slate-100 text-slate-400 font-black text-xs px-2.5 py-1 rounded-full">Done!</span>
                             ) : (
                                <span className="bg-amber-400 text-slate-900 font-black text-xs px-2.5 py-1 rounded-full shadow-sm">+{q.xp} XP</span>
                             )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 mb-3 truncate">{q.description || "Daily morning routine"}</p>
                          
                          <div className="flex justify-between items-center">
                             <span className="bg-slate-100 text-slate-500 font-black text-[10px] px-3 py-1 rounded-full capitalize">{q.repetition}</span>
                             {isDone ? (
                                <button className="bg-slate-100 text-slate-500 font-black text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Completed</button>
                             ) : (
                                <button className="bg-emerald-500 text-white font-black text-xs px-4 py-1.5 rounded-full shadow-sm">Mark Done</button>
                             )}
                          </div>
                       </div>
                    </div>
                  );
               })}
            </div>
            
            {/* Streak Card */}
            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center shrink-0"><Flame className="w-7 h-7 text-orange-500" /></div>
              <div>
                 <h4 className="font-black text-lg text-slate-800 mb-0.5">Streak on fire!</h4>
                 <p className="text-xs font-bold text-slate-500 leading-tight">Keep going today to protect your 7-day streak.</p>
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
          <div className="animate-fade-in px-4 pt-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center shadow-md"><Users className="w-7 h-7 text-white" /></div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight">Teams</h1>
                <p className="text-xs font-bold text-slate-500 mt-1">Join your friends and family!</p>
              </div>
            </div>

            {/* Join Team Form */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-8">
               <h3 className="font-black text-lg text-slate-800 mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500"/> Join a Team</h3>
               <form onSubmit={handleJoinTeam} className="flex gap-2">
                 <input
                   type="text"
                   placeholder="Enter invite code"
                   required
                   value={joinTeamCode}
                   onChange={e => setJoinTeamCode(e.target.value.toUpperCase())}
                   className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all uppercase placeholder:normal-case"
                 />
                 <button disabled={joinTeamLoading} type="submit" className="bg-indigo-600 text-white font-black px-6 rounded-2xl shadow-[0_4px_0_0_rgba(79,70,229,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center">
                   {joinTeamLoading ? "..." : "Join"}
                 </button>
               </form>
            </div>

            {/* Teams List */}
            <div className="space-y-6">
              {teams.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                   <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                   <p className="text-lg font-black text-slate-600">You haven't joined any teams yet.</p>
                   <p className="text-sm font-bold text-slate-400 mt-1">Ask your parents for an invite code!</p>
                </div>
              ) : (
                teams.map(team => (
                  <div key={team.id} className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-50">
                    <div className="bg-indigo-50 p-5 flex items-center gap-4">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-indigo-100">{team.icon}</div>
                      <div>
                        <h3 className="font-black text-xl text-slate-900 leading-tight">{team.name}</h3>
                        <p className="text-xs font-bold text-indigo-600 mt-1 uppercase tracking-wider">{team.members.length} Members</p>
                      </div>
                    </div>
                    
                    {/* Leaderboard */}
                    <div className="p-2">
                       <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mx-4 mt-2 mb-3">Leaderboard</h4>
                       <div className="space-y-1">
                         {team.members.map((m: any, idx: number) => {
                           const isMe = m.id === childUser.id;
                           return (
                             <div key={m.id} className={`flex items-center justify-between p-3 rounded-2xl ${isMe ? 'bg-amber-50 border border-amber-100' : 'bg-transparent'}`}>
                               <div className="flex items-center gap-3">
                                 <span className={`w-6 text-center font-black ${idx === 0 ? 'text-amber-500 text-lg' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300'}`}>
                                   {idx === 0 ? '👑' : `#${idx + 1}`}
                                 </span>
                                 <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center shadow-sm text-lg">
                                   {getAvatarEmoji(m.avatar)}
                                 </div>
                                 <span className={`font-black ${isMe ? 'text-amber-900' : 'text-slate-700'}`}>{m.name} {isMe && '(You)'}</span>
                               </div>
                               <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                                 <span className="font-black text-slate-700">{m.xp}</span>
                                 <span className="text-[10px] font-bold text-slate-400">XP</span>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                     <p className="font-black text-xl text-slate-800 leading-tight">8 <span className="text-xs text-slate-500">Earned</span></p>
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
                           🐲
                        </div>
                        <div className="absolute -top-1 -left-1 bg-amber-400 w-7 h-7 rounded-full flex items-center justify-center text-xs border-[3px] border-white shadow-sm">💎</div>
                        <div className="absolute -bottom-1 -right-1 bg-pink-400 w-7 h-7 rounded-full flex items-center justify-center text-white border-[3px] border-white shadow-sm"><Heart className="w-3.5 h-3.5 fill-current" /></div>
                     </div>
                     
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                           <h4 className="font-black text-2xl text-slate-800">Sparky</h4>
                           <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full">Happy</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mb-4 leading-tight">Your dragon companion is ready to play and learn.</p>
                        
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 mb-1.5 px-1">
                           <span>Energy</span>
                           <span>78%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                           <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex gap-3">
                     <button onClick={feedPet} className="flex-1 bg-orange-500 text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-transform"><span className="text-lg">🍖</span> Feed Pet</button>
                     <button className="flex-1 bg-purple-600 text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:-translate-y-0.5 transition-transform"><Gamepad2 className="w-5 h-5" /> Play</button>
                  </div>
               </div>
            </div>

            {/* My Badges Section */}
            <div className="bg-white rounded-[36px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
               <div className="flex justify-between items-start mb-5">
                  <div>
                     <h3 className="font-black text-2xl text-slate-800 mb-1">My Badges</h3>
                     <p className="text-xs font-bold text-slate-500 leading-tight">Collect sticker-style achievements as you grow</p>
                  </div>
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 text-amber-600" /></div>
               </div>
               
               <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 pt-1 px-1">
                  {['First Task', '7-Day Streak', 'Reading Master', 'Fitness Hero'].map((badge, i) => {
                     const colors = ['border-amber-400', 'border-blue-400', 'border-amber-400', 'border-emerald-400'];
                     const icons = ['📋', '🔥', '📖', '💪'];
                     return (
                        <div key={i} className={`w-[96px] h-[120px] rounded-full border-2 ${colors[i]} bg-slate-50 flex flex-col items-center justify-center shrink-0 shadow-sm p-3 text-center`}>
                           <div className="text-3xl mb-2">{icons[i]}</div>
                           <p className="text-[10px] font-black text-slate-700 leading-tight">{badge}</p>
                        </div>
                     )
                  })}
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

    </div>
  );
}
