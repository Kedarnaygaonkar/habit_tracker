import React, { useState, useEffect } from "react";
import { Users, Plus, Trophy, Check, Gift, Rocket, Star, Medal, Crown } from "lucide-react";
import Modal from "./Modal";

interface ParentTeamDashboardProps {
  token: string;
  parent: any;
}

export default function ParentTeamDashboard({ token, parent }: ParentTeamDashboardProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ open: false, name: "", icon: "👨‍👩‍👧" });
  const [questForm, setQuestForm] = useState({ open: false, title: "", xp: "20", coins: "20", repetition: "daily" });
  const [rewardForm, setRewardForm] = useState({ open: false, title: "", coinsCost: "100" });
  
  // UI State
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const authHeaders = { "Content-Type": "application/json", Authorization: Bearer  };

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/parent-teams", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        if (!selectedTeamId && data.length > 0) setSelectedTeamId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };
  const showErr = (msg: string) => { setError(msg); setTimeout(() => setError(""), 5000); };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinLoading(true);
    try {
      const res = await fetch("/api/parent-teams/join", { method: "POST", headers: authHeaders, body: JSON.stringify({ inviteCode: joinCode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJoinCode("");
      await fetchTeams();
      setSelectedTeamId(data.team.id);
      showMsg("Joined team!");
    } catch (err: any) {
      showErr(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/parent-teams", { method: "POST", headers: authHeaders, body: JSON.stringify({ name: createForm.name, icon: createForm.icon }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreateForm({ open: false, name: "", icon: "👨‍👩‍👧" });
      await fetchTeams();
      setSelectedTeamId(data.id);
      showMsg("Team created!");
    } catch (err: any) {
      showErr(err.message);
    }
  };

  const handleAddQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    try {
      const res = await fetch(`/api/parent-teams/${selectedTeamId}/quests`, { method: "POST", headers: authHeaders, body: JSON.stringify(questForm) });
      if (!res.ok) throw new Error((await res.json()).error);
      setQuestForm({ open: false, title: "", xp: "20", coins: "20", repetition: "daily" });
      await fetchTeams();
      showMsg("Task added!");
    } catch (err: any) {
      showErr(err.message);
    }
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    try {
      const res = await fetch(`/api/parent-teams/${selectedTeamId}/rewards`, { method: "POST", headers: authHeaders, body: JSON.stringify(rewardForm) });
      if (!res.ok) throw new Error((await res.json()).error);
      setRewardForm({ open: false, title: "", coinsCost: "100" });
      await fetchTeams();
      showMsg("Reward added!");
    } catch (err: any) {
      showErr(err.message);
    }
  };

  const handleMarkDone = async (questId: string) => {
    if (!selectedTeamId) return;
    try {
      const res = await fetch(`/api/parent-teams/${selectedTeamId}/quests/${questId}/submit`, { method: "POST", headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchTeams();
      showMsg(`Task completed! +${data.parentXP - (parent.xp || 0)} XP`);
      
      // Update local parent object optimistically
      parent.xp = data.parentXP;
      parent.coins = data.parentCoins;
    } catch (err: any) {
      showErr(err.message);
    }
  };

  const handleClaimReward = async (rewardId: string, cost: number) => {
    if (!selectedTeamId) return;
    if ((parent.coins || 0) < cost) { showErr("Not enough coins!"); return; }
    try {
      const res = await fetch(`/api/parent-teams/${selectedTeamId}/rewards/${rewardId}/claim`, { method: "POST", headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchTeams();
      showMsg(`Reward claimed! -${cost} Coins`);
      parent.coins = data.parentCoins;
    } catch (err: any) {
      showErr(err.message);
    }
  };

  const handleShareTeam = async (team: any) => {
    const shareUrl = `${window.location.origin}/?team=${team.inviteCode}`;
    const shareData = {
      title: `Join parent team "${team.name}" on HabitQuest!`,
      text: `Join my HabitQuest Parent Team "${team.name}"! Use invite code: ${team.inviteCode}`,
      url: shareUrl,
    };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedId(team.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Loading Teams...</div>;

  const team = teams.find(t => t.id === selectedTeamId) || teams[0];
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {message && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-xl z-50 animate-bounce-in flex items-center gap-2"><Check className="w-5 h-5 text-emerald-400" /> {message}</div>}
      {error && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-xl z-50 animate-shake flex items-center gap-2">⚠️ {error}</div>}

      {teams.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 max-w-lg mx-auto mt-10">
          <div className="w-20 h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-500 mx-auto mb-6">
            <Users className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Join a Parent Team</h2>
          <p className="text-slate-500 text-center font-bold mb-8">Track your own habits with other parents, set shared tasks, and compete on the leaderboard!</p>
          
          <form onSubmit={handleJoin} className="space-y-4 mb-8">
            <input type="text" placeholder="Enter Invite Code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-center font-black text-2xl tracking-[0.2em] text-slate-700 placeholder:text-slate-300 placeholder:font-bold focus:border-indigo-400 focus:bg-white outline-none transition-all uppercase" required />
            <button disabled={joinLoading} type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-2">
              <Rocket className="w-5 h-5" /> {joinLoading ? "Joining..." : "Join Team"}
            </button>
          </form>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 font-black text-xs uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button onClick={() => setCreateForm({ ...createForm, open: true })} className="w-full mt-4 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 font-black py-4 rounded-2xl transition-all">
            Create a New Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Team Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Team Selector & Header */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <select value={selectedTeamId || ""} onChange={e => setSelectedTeamId(e.target.value)} className="bg-slate-50 border-2 border-slate-200 text-slate-800 font-black text-lg py-3 px-4 rounded-xl outline-none focus:border-indigo-400 cursor-pointer w-full sm:w-auto">
                  {teams.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
                
                <div className="flex gap-2">
                  <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2 font-black">
                    <span className="text-[10px] uppercase tracking-wider text-indigo-400">Code</span>
                    {team?.inviteCode}
                  </div>
                  <button onClick={() => handleShareTeam(team)} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 active:scale-95 transition-all shadow-md shadow-purple-200">
                    {copiedId === team?.id ? "Copied!" : "Share"}
                  </button>
                </div>
              </div>

              {team && (
                <>
                  <div className="flex items-center justify-between mt-8 mb-4">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Check className="text-emerald-500 w-6 h-6" /> Team Tasks</h3>
                    {team.creatorId === parent.id && (
                      <button onClick={() => setQuestForm({ ...questForm, open: true })} className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"><Plus className="w-4 h-4"/> Add Task</button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {team.quests?.length === 0 && <p className="text-slate-400 font-medium italic p-4 text-center bg-slate-50 rounded-xl">No shared tasks yet.</p>}
                    {team.quests?.map((q: any) => {
                      const isDoneToday = team.history?.some((h: any) => h.parentId === parent.id && h.questId === q.id && h.completedAt.startsWith(todayStr));
                      return (
                        <div key={q.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <h4 className={`font-black text-lg ${isDoneToday ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{q.title}</h4>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">+{q.xp} XP</span>
                              <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-md">+{q.coins} Coins</span>
                            </div>
                          </div>
                          {!isDoneToday ? (
                            <button onClick={() => handleMarkDone(q.id)} className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-black px-4 py-2 rounded-xl shadow-md shadow-emerald-200 flex items-center gap-2">Mark Done</button>
                          ) : (
                            <span className="text-emerald-600 bg-emerald-100 font-black px-4 py-2 rounded-xl flex items-center gap-1"><Check className="w-5 h-5"/> Done</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-10 mb-4">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Gift className="text-purple-500 w-6 h-6" /> Team Rewards</h3>
                    {team.creatorId === parent.id && (
                      <button onClick={() => setRewardForm({ ...rewardForm, open: true })} className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1"><Plus className="w-4 h-4"/> Add Reward</button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {team.rewards?.length === 0 && <p className="text-slate-400 font-medium italic p-4 text-center bg-slate-50 rounded-xl sm:col-span-2">No rewards yet.</p>}
                    {team.rewards?.map((r: any) => (
                      <div key={r.id} className="flex flex-col justify-between p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                        <h4 className="font-black text-slate-800 mb-1">{r.title}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-black text-yellow-600 flex items-center gap-1">🪙 {r.coinsCost}</span>
                          <button onClick={() => handleClaimReward(r.id, r.coinsCost)} className="bg-white hover:bg-purple-600 hover:text-white border border-purple-200 text-purple-600 font-bold px-3 py-1 rounded-lg text-sm transition-colors active:scale-95 shadow-sm">Claim</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Leaderboard Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-indigo-500 to-purple-600 rounded-[2rem] p-6 shadow-lg shadow-indigo-200 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
              
              <h3 className="text-xl font-black flex items-center gap-2 mb-6 relative z-10"><Trophy className="text-yellow-300 w-6 h-6"/> Leaderboard</h3>
              
              <div className="space-y-3 relative z-10">
                {team?.members?.map((m: any, idx: number) => (
                  <div key={m.id} onClick={() => setSelectedParentId(m.id)} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:bg-white/20 ${m.id === parent.id ? 'bg-white/20 border border-white/30' : 'bg-white/10 border border-white/5'}`}>
                    <div className="font-black w-6 text-center text-white/70">{idx + 1}</div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-300 to-orange-400 flex items-center justify-center text-xl shadow-md border-2 border-white/20 shrink-0">
                      {idx === 0 ? "👑" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "⭐"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black truncate">{m.familyName} {m.id === parent.id && "(You)"}</div>
                      <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Lvl {m.level} • {m.streak}🔥</div>
                    </div>
                    <div className="font-black text-yellow-300 shrink-0">{m.xp} XP</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
               <h3 className="font-black text-lg text-slate-800 mb-4">Join Another Team</h3>
               <form onSubmit={handleJoin} className="flex gap-2">
                 <input type="text" placeholder="Invite Code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-indigo-400 uppercase" required />
                 <button disabled={joinLoading} type="submit" className="bg-indigo-600 text-white font-black px-4 rounded-xl hover:bg-indigo-700 transition-colors">Join</button>
               </form>
            </div>
          </div>
        </div>
      )}

      {/* Parent Profile Modal (Calendar) */}
      {selectedParentId && (
        <Modal title="Parent Profile" emoji="🦸" onClose={() => setSelectedParentId(null)}>
          {(() => {
            const m = team?.members?.find((x: any) => x.id === selectedParentId);
            if (!m) return null;
            
            // Build calendar
            const now = new Date();
            const y = now.getFullYear(); const mo = now.getMonth();
            const daysInMo = new Date(y, mo + 1, 0).getDate();
            const days = Array.from({length: daysInMo}, (_, i) => new Date(y, mo, i + 1));
            
            return (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-3xl shadow-inner border-4 border-white">
                    👨‍👩‍👧
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">{m.familyName}</h3>
                    <p className="text-slate-500 font-bold">Level {m.level} • {m.xp} XP</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500"/> Consistency Calendar</h4>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {['S','M','T','W','T','F','S'].map(d => <div key={d+Math.random()} className="text-center text-[10px] font-black text-slate-400">{d}</div>)}
                    {Array.from({length: new Date(y, mo, 1).getDay()}).map((_, i) => <div key={'empty'+i}/>)}
                    {days.map(d => {
                      const dStr = d.toISOString().slice(0, 10);
                      const isToday = dStr === todayStr;
                      const hasActivity = team?.history?.some((h: any) => h.parentId === m.id && h.completedAt.startsWith(dStr));
                      
                      return (
                        <div key={d.getDate()} className={`aspect-square rounded-xl flex items-center justify-center text-sm font-black transition-all ${hasActivity ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 scale-105' : isToday ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}>
                          {d.getDate()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}
        </Modal>
      )}

      {/* Create Team Modal */}
      {createForm.open && (
        <Modal title="Create Parent Team" emoji="👨‍👩‍👧" onClose={() => setCreateForm({ ...createForm, open: false })}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Team Name" value={createForm.name} onChange={v => setCreateForm({...createForm, name: v})} placeholder="e.g. Fitness Moms" required />
            <FormField label="Team Emoji" value={createForm.icon} onChange={v => setCreateForm({...createForm, icon: v})} required />
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl mt-4">Create Team</button>
          </form>
        </Modal>
      )}

      {/* Add Task Modal */}
      {questForm.open && (
        <Modal title="Add Team Task" emoji="📋" onClose={() => setQuestForm({ ...questForm, open: false })}>
          <form onSubmit={handleAddQuest} className="space-y-4">
            <FormField label="Task Title" value={questForm.title} onChange={v => setQuestForm({...questForm, title: v})} placeholder="e.g. 10k Steps" required />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="XP Reward" type="number" value={questForm.xp} onChange={v => setQuestForm({...questForm, xp: v})} required />
              <FormField label="Coins Reward" type="number" value={questForm.coins} onChange={v => setQuestForm({...questForm, coins: v})} required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2 ml-1">Repetition</label>
              <select value={questForm.repetition} onChange={e => setQuestForm({...questForm, repetition: e.target.value})} className="input w-full">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl mt-4">Save Task</button>
          </form>
        </Modal>
      )}

      {/* Add Reward Modal */}
      {rewardForm.open && (
        <Modal title="Add Team Reward" emoji="🎁" onClose={() => setRewardForm({ ...rewardForm, open: false })}>
          <form onSubmit={handleAddReward} className="space-y-4">
            <FormField label="Reward Title" value={rewardForm.title} onChange={v => setRewardForm({...rewardForm, title: v})} placeholder="e.g. Cheat Meal" required />
            <FormField label="Coins Cost" type="number" value={rewardForm.coinsCost} onChange={v => setRewardForm({...rewardForm, coinsCost: v})} required />
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl mt-4">Save Reward</button>
          </form>
        </Modal>
      )}

    </div>
  );
}

const FormField = ({ label, type = "text", value, onChange, placeholder, required }: any) => (
  <div>
    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2 ml-1">{label}</label>
    <input type={type} required={required} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="input w-full bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-indigo-400" />
  </div>
);
