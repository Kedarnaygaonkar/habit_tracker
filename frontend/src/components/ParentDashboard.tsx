import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Edit2, LogOut, Plus, Sparkles, Trash2, X, Shield, Users, Zap, Flame, Star, Bell, Image as ImageIcon, CheckCircle, ArrowRight, User, Share2, MoreVertical, Calendar as CalendarIcon, ChevronLeft } from "lucide-react";

interface ParentDashboardProps {
  token: string;
  parent: { id: string; name: string; email: string };
  onLogout: () => void;
}

type Tab = "heroes" | "tasks" | "rewards" | "verify" | "settings";

const emptyChildForm = { open: false, isEdit: false, id: "", name: "", loginId: "", password: "", avatar: "avatar_knight", age: 7, gender: "boy" };
const emptyQuestForm = { open: false, isEdit: false, id: "", childId: "", title: "", difficulty: "medium", repetition: "daily", reminderTime: "08:00", requireProof: "none", category: "general" };
const emptyRewardForm = { open: false, childId: "", title: "", coinsCost: "30" };

export default function ParentDashboard({ token, parent, onLogout }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("heroes");
  const [manageSubTab, setManageSubTab] = useState<"tasks" | "rewards" | "verify">("tasks");
  const [children, setChildren] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [questHistory, setQuestHistory] = useState<any[]>([]);
  const [selectedHero, setSelectedHero] = useState<any | null>(null);
  const [selectedTaskHistory, setSelectedTaskHistory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [childForm, setChildForm] = useState(emptyChildForm);
  const [questForm, setQuestForm] = useState(emptyQuestForm);
  const [rewardForm, setRewardForm] = useState(emptyRewardForm);
  const [teamForm, setTeamForm] = useState({ open: false, name: "", icon: "🏆" });
  const [rejectModal, setRejectModal] = useState({ open: false, questId: "", comment: "" });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareTeam = async (team: any) => {
    const shareUrl = `${window.location.origin}/?team=${team.inviteCode}`;
    const shareData = {
      title: `Join team "${team.name}" on HabitQuest!`,
      text: `Join my HabitQuest Team "${team.name}"! Use invite code: ${team.inviteCode} or click this link to join directly:`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard if cancelled/unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(team.id);
      showMsg("Invite link copied to clipboard! 📋");
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      alert(`Invite Link:\n${shareUrl}`);
    }
  };

  // AI Tools
  const [plannerPrompt, setPlannerPrompt] = useState("My child needs a better morning routine.");
  const [aiPlanResult, setAiPlanResult] = useState<any | null>(null);
  const [assistantQ, setAssistantQ] = useState("How do I encourage homework?");
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [showAiPlannerModal, setShowAiPlannerModal] = useState(false);
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);

  const avatars = [
    { key: "avatar_knight", name: "Knight", icon: "🛡️" },
    { key: "avatar_wizard", name: "Wizard", icon: "🔮" },
    { key: "avatar_ninja", name: "Ninja", icon: "🥷" },
    { key: "avatar_ranger", name: "Ranger", icon: "🏹" },
    { key: "avatar_unicorn", name: "Unicorn", icon: "🦄" },
  ];

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const authHeaders = { Authorization: `Bearer ${token}` };

  const showMsg = (t: string) => { setMessage(t); setTimeout(() => setMessage(""), 3500); };
  const getEmoji = (key: string) => avatars.find(a => a.key === key)?.icon || "👤";
  const childName = (id: string) => children.find(c => c.id === id)?.name || "Unknown";
  const childAvatar = (id: string) => children.find(c => c.id === id)?.avatar || "avatar_knight";

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [cR, qR, rR, tR, hR] = await Promise.all([
        fetch("/api/parent/children", { headers: authHeaders }),
        fetch("/api/quests", { headers: authHeaders }),
        fetch("/api/rewards", { headers: authHeaders }),
        fetch("/api/parent/teams", { headers: authHeaders }),
        fetch("/api/parent/questHistory", { headers: authHeaders }),
      ]);
      if (!cR.ok || !qR.ok || !rR.ok || !tR.ok || !hR.ok) throw new Error("Failed to load data.");
      setChildren(await cR.json());
      setQuests(await qR.json());
      setRewards(await rR.json());
      setTeams(await tR.json());
      setQuestHistory(await hR.json());
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ── CRUD handlers ──
  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const url = childForm.isEdit ? `/api/parent/children/${childForm.id}` : "/api/parent/children";
      const res = await fetch(url, { method: childForm.isEdit ? "PUT" : "POST", headers, body: JSON.stringify({ name: childForm.name, loginId: childForm.loginId, password: childForm.password, avatar: childForm.avatar, age: childForm.age, gender: childForm.gender }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChildForm(emptyChildForm); await fetchData(); showMsg(childForm.isEdit ? "Updated!" : "Hero created!");
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleQuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const url = questForm.isEdit ? `/api/parent/quests/${questForm.id}` : "/api/parent/quests";
      const res = await fetch(url, { method: questForm.isEdit ? "PUT" : "POST", headers, body: JSON.stringify({ childId: questForm.childId, title: questForm.title, difficulty: questForm.difficulty, repetition: questForm.repetition, reminderTime: questForm.reminderTime, requireProof: questForm.requireProof, category: questForm.category }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestForm(emptyQuestForm); await fetchData(); showMsg(questForm.isEdit ? "Updated!" : "Task added! ⚔️");
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await fetch("/api/parent/rewards", { method: "POST", headers, body: JSON.stringify({ childId: rewardForm.childId, title: rewardForm.title, coinsCost: rewardForm.coinsCost }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRewardForm(emptyRewardForm); await fetchData(); showMsg("Reward added! 🎁");
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await fetch("/api/teams", { method: "POST", headers, body: JSON.stringify({ name: teamForm.name, icon: teamForm.icon }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTeamForm({ open: false, name: "", icon: "🏆" }); await fetchData(); showMsg("Team created! 🎉");
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const deleteChild = async (id: string) => { if (!confirm("Delete this child?")) return; const r = await fetch(`/api/parent/children/${id}`, { method: "DELETE", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Deleted."); } };
  const deleteQuest = async (id: string) => { if (!confirm("Delete this task?")) return; const r = await fetch(`/api/parent/quests/${id}`, { method: "DELETE", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Deleted."); } };
  const deleteReward = async (id: string) => { if (!confirm("Delete this reward?")) return; const r = await fetch(`/api/parent/rewards/${id}`, { method: "DELETE", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Deleted."); } };
  const deleteTeam = async (id: string) => { if (!confirm("Delete this team?")) return; const r = await fetch(`/api/teams/${id}`, { method: "DELETE", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Team deleted."); } };
  const verifyQuest = async (id: string) => { const r = await fetch(`/api/parent/quests/${id}/verify`, { method: "POST", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Verified! ✅"); } else { const d = await r.json(); setError(d.error); } };
  const rejectQuest = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch(`/api/parent/quests/${rejectModal.questId}/reject`, { method: "POST", headers, body: JSON.stringify({ comment: rejectModal.comment }) }); if (r.ok) { setRejectModal({ open: false, questId: "", comment: "" }); await fetchData(); showMsg("Sent back."); } };
  const approveReward = async (id: string) => { const r = await fetch(`/api/parent/rewards/${id}/approve`, { method: "POST", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Approved! 🎉"); } };
  const rejectReward = async (id: string) => { const r = await fetch(`/api/parent/rewards/${id}/reject`, { method: "POST", headers, body: JSON.stringify({ comment: "Not approved." }) }); if (r.ok) { await fetchData(); showMsg("Rejected."); } };

  const handleAIPlan = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch("/api/ai/plan", { method: "POST", headers, body: JSON.stringify({ description: plannerPrompt }) }); setAiPlanResult(await r.json()); };
  const handleAIAdvice = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch("/api/ai/assistant", { method: "POST", headers, body: JSON.stringify({ question: assistantQ }) }); const d = await r.json(); setAiAdvice(d.advice || "No advice."); };

  const pendingQuests = quests.filter(q => q.status === "completed");
  const requestedRewards = rewards.filter(r => r.status === "requested");

  const navItems = [
    { id: "heroes" as Tab, icon: <Users size={22} />, label: "Heroes", alert: false },
    { id: "tasks" as Tab, icon: <CheckCircle size={22} />, label: "Manage", alert: pendingQuests.length > 0 || requestedRewards.length > 0 },
    { id: "teams" as Tab, icon: <Users size={22} />, label: "Teams", alert: false },
    { id: "settings" as Tab, icon: <User size={22} />, label: "Settings", alert: false },
  ];

  return (
    <>
    <div className="parent-portal-bg min-h-screen pb-24 select-none">
      {/* Toast */}
      {message && <div className="toast flex items-center gap-2 z-50"><Check className="w-4 h-4 text-green-600" /> {message}</div>}

      <main className="max-w-2xl mx-auto">
        {error && <div className="m-4 p-3 rounded-xl text-sm font-bold bg-red-50 border-2 border-red-200 text-red-600 flex items-center gap-2">⚠️ {error}</div>}

        {/* ── HEROES ── */}
        {activeTab === "heroes" && (
          <div className="animate-fade-in pb-10">
            <header className="flex items-center justify-between px-6 pt-10 pb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 ">My Heroes</h1>
                <p className="text-sm font-semibold text-slate-500 mt-1">Manage your children's profiles</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center">
                 <Shield className="w-6 h-6" />
              </div>
            </header>

            <div className="px-6 flex gap-3 mb-8">
              <div className="flex-1 bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col items-center">
                <Users className="w-5 h-5 text-slate-700 mb-2" strokeWidth={2.5} />
                <span className="text-xl font-black text-slate-900 ">{children.length}</span>
                <span className="text-xs text-slate-400 font-semibold mt-1">Heroes</span>
              </div>
              <div className="flex-1 bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col items-center">
                <Zap className="w-5 h-5 text-amber-500 mb-2" strokeWidth={2.5} />
                <span className="text-xl font-black text-slate-900 ">{children.reduce((acc, c) => acc + (c.xp || 0), 0).toLocaleString()}</span>
                <span className="text-xs text-slate-400 font-semibold mt-1">Total XP</span>
              </div>
              <div className="flex-1 bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col items-center">
                <Flame className="w-5 h-5 text-red-500 mb-2" strokeWidth={2.5} />
                <span className="text-xl font-black text-slate-900 ">{Math.max(...children.map(c => c.streak || 0), 0)}</span>
                <span className="text-xs text-slate-400 font-semibold mt-1">Day Streak</span>
              </div>
            </div>

            <div className="px-6 flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 ">Your Children</h3>
              <span className="text-xs font-semibold text-slate-400">Swipe to browse</span>
            </div>

            <div className="px-6 flex overflow-x-auto gap-4 pb-4 snap-x hide-scroll">
              {children.map(c => (
                <div key={c.id} className={`snap-start shrink-0 w-[180px] rounded-[2rem] p-5 flex flex-col relative cursor-pointer transition-colors ${c.gender === 'girl' ? 'bg-[#fce6f3] hover:bg-[#fad4eb]' : 'bg-[#e6f0fa] hover:bg-[#d4e6f9]'}`} onClick={() => setSelectedHero(c)}>
                  {/* Edit Button (3 dots) */}
                  <button 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-white/50 hover:bg-white rounded-full p-1.5 transition-colors z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChildForm({ open: true, isEdit: true, id: c.id, name: c.name, loginId: c.loginId || "", password: "", avatar: c.avatar, age: c.age || 7, gender: c.gender || "boy" });
                    }}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {/* Top Left Pills */}
                  <div className="flex flex-col items-start gap-1">
                     <div className={`${c.gender === 'girl' ? 'bg-pink-500' : 'bg-blue-500'} text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm`}>Level {c.level || 1}</div>
                     <Star className="w-6 h-6 text-slate-800 ml-1 mt-1" strokeWidth={2.5} />
                  </div>

                  {/* Avatar Progress */}
                  <div className="mt-4 mb-4 flex justify-center">
                     <div className="progress-ring-container">
                       <div className="progress-ring" style={{"--progress": c.xp ? Math.min(100, (c.xp % 1000) / 10) : 0, stroke: c.gender === 'girl' ? '#ec4899' : '#3b82f6'} as any}>
                          <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden border-[3px] border-white flex items-center justify-center text-3xl z-10 relative">
                             {getEmoji(c.avatar)}
                          </div>
                       </div>
                       <div className={`absolute -bottom-1 -right-1 ${c.gender === 'girl' ? 'bg-pink-500' : 'bg-blue-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white z-20 shadow-sm`}>
                         {c.xp ? Math.min(100, Math.floor((c.xp % 1000) / 10)) : 0}%
                       </div>
                     </div>
                  </div>

                  <div className="text-center mt-2">
                    <h4 className="text-xl font-black text-slate-900 ">{c.name}</h4>
                    <p className="text-[11px] text-slate-400 font-bold mb-3">{c.age || 7} years old</p>
                    <div className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm text-xs font-black text-slate-700 ">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {c.xp || 0} XP
                    </div>
                  </div>
                </div>
              ))}
              
              <div onClick={() => setChildForm({ ...emptyChildForm, open: true })} className="snap-start shrink-0 w-[180px] add-hero-card">
                 <div className="add-hero-icon"><Plus className="w-6 h-6" strokeWidth={3} /></div>
                 <h4 className="text-sm font-bold text-blue-600 mb-1">Add a Hero</h4>
                 <p className="text-[10px] font-semibold text-blue-400 text-center px-2 leading-tight">Create a new child profile</p>
              </div>
            </div>
          </div>
        )}

        {/* ── MANAGE (Tasks, Rewards, Verify) ── */}
        {(activeTab === "tasks" || activeTab === "rewards" || activeTab === "verify") && (
          <div className="animate-fade-in pb-10 relative min-h-[80vh]">
            <header className="px-6 pt-10 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Portal</p>
                  <h1 className="text-3xl font-black text-slate-900 ">Manage</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center relative">
                  <Bell className="w-5 h-5 text-slate-600 " />
                  {(pendingQuests.length > 0 || requestedRewards.length > 0) && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
              </div>
              <div className="segmented-control">
                <div className={`segmented-btn ${manageSubTab === "tasks" ? "active" : ""}`} onClick={() => { setManageSubTab("tasks"); setActiveTab("tasks"); }}>
                  <CheckCircle className="w-4 h-4 inline-block mr-1 -mt-0.5" /> Tasks
                </div>
                <div className={`segmented-btn ${manageSubTab === "rewards" ? "active" : ""}`} onClick={() => { setManageSubTab("rewards"); setActiveTab("tasks"); }}>
                  <Sparkles className="w-4 h-4 inline-block mr-1 -mt-0.5" /> Rewards
                </div>
                <div className={`segmented-btn ${manageSubTab === "verify" ? "active relative" : "relative"}`} onClick={() => { setManageSubTab("verify"); setActiveTab("tasks"); }}>
                  <Shield className="w-4 h-4 inline-block mr-1 -mt-0.5" /> Verify
                  {pendingQuests.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </div>
              </div>
            </header>

            {manageSubTab === "tasks" && (
              <div className="px-6 pb-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider">Active Tasks</h3>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-3 py-1 rounded-full">{quests.length} tasks</span>
                </div>
                
                <div className="space-y-3">
                  {quests.map(q => (
                    <div key={q.id} className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-50 flex items-center justify-between cursor-pointer hover:border-slate-200 transition-colors" onClick={() => setQuestForm({ open: true, isEdit: true, id: q.id, childId: q.childId, title: q.title, difficulty: q.difficulty, repetition: q.repetition, reminderTime: q.reminderTime, requireProof: q.requireProof, category: q.category || "general" })}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-blue-500" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="font-black text-base text-slate-900 leading-tight mb-1">{q.title}</p>
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-slate-200 text-xs flex items-center justify-center border border-white ">{getEmoji(childAvatar(q.childId))}</div>
                             <span className="text-[10px] font-bold text-slate-400">↻ {q.repetition}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-red-100 text-red-500 p-1.5 rounded-full cursor-pointer hover:bg-red-200 transition-colors" onClick={(e) => { e.stopPropagation(); deleteQuest(q.id); }}>
                           <Trash2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1.5 rounded-full">
                          +{q.xp} XP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="fab-button" onClick={() => setQuestForm({ ...emptyQuestForm, open: true, childId: children[0]?.id || "" })}>
                  <Plus className="w-8 h-8" strokeWidth={3} />
                </div>
              </div>
            )}

            {manageSubTab === "rewards" && (
              <div className="px-6 pb-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider">Available Rewards</h3>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-3 py-1 rounded-full">{rewards.length} rewards</span>
                </div>
                
                <div className="space-y-3">
                  {rewards.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-50 flex items-center justify-between cursor-pointer hover:border-slate-200 transition-colors" onClick={() => setRewardForm({ open: true, childId: r.childId, title: r.title, coinsCost: r.coinsCost })}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-purple-500" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="font-black text-base text-slate-900 leading-tight mb-1">{r.title}</p>
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-slate-200 text-xs flex items-center justify-center border border-white ">{getEmoji(childAvatar(r.childId))}</div>
                             <span className="text-[10px] font-bold text-slate-400">{childName(r.childId)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-1 rounded-full flex gap-1 items-center">
                         <Trash2 className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); deleteReward(r.id); }}/>
                        {r.coinsCost} 🪙
                      </div>
                    </div>
                  ))}
                </div>
                <div className="fab-button" onClick={() => setRewardForm({ ...emptyRewardForm, open: true, childId: children[0]?.id || "" })}>
                  <Plus className="w-8 h-8" strokeWidth={3} />
                </div>
              </div>
            )}
            {manageSubTab === "verify" && (
              <div className="px-6 pb-24">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider">Pending Verifications</h3>
                 </div>
                 
                 {pendingQuests.length === 0 ? (
                    <div className="text-center py-10">
                       <CheckCircle className="w-16 h-16 text-green-200 mx-auto mb-4" />
                       <p className="text-lg font-black text-slate-700 ">All caught up!</p>
                    </div>
                 ) : (
                    <div className="space-y-6">
                      {pendingQuests.map(q => (
                         <div key={q.id} className="bg-white rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-50 ">
                           {/* Header */}
                           <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-xl">{getEmoji(childAvatar(q.childId))}</div>
                              <div>
                                 <p className="font-black text-sm text-slate-900 leading-tight">{childName(q.childId)}</p>
                                 <p className="text-[10px] text-slate-400 font-semibold">🕒 Just now</p>
                              </div>
                           </div>
                           {/* Body */}
                           <h4 className="font-black text-base text-slate-900 mb-1">{q.title}</h4>
                           <p className="text-xs text-slate-500 font-medium mb-3">Completed quest marked as done.</p>
                           {q.proofImage && (
                              <div className="mb-3">
                                 <img src={q.proofImage} alt="proof" className="w-full h-32 object-cover rounded-xl bg-slate-100 " />
                                 <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> 1 photo proof attached</p>
                              </div>
                           )}
                           {/* Actions */}
                           <div className="flex gap-3 mt-4">
                              <button onClick={() => verifyQuest(q.id)} className="flex-1 bg-[#00b85c] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 active:scale-95 transition-all">
                                 <Check className="w-4 h-4" strokeWidth={3} /> Approve
                              </button>
                              <button onClick={() => setRejectModal({ open: true, questId: q.id, comment: "" })} className="flex-1 bg-slate-50 text-red-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-100 hover:bg-red-50 active:scale-95 transition-all">
                                 <X className="w-4 h-4" strokeWidth={3} /> Reject
                              </button>
                           </div>
                         </div>
                      ))}
                    </div>
                 )}
              </div>
            )}
          </div>
        )}

        {/* ── TEAMS ── */}
        {activeTab === "teams" && (
          <div className="animate-fade-in pb-10">
            <header className="flex items-center justify-between px-6 pt-10 pb-6 border-b border-slate-100">
              <div className="flex gap-3">
                 <Users className="w-5 h-5 text-slate-600 mt-1" />
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Portal</p>
                    <h1 className="text-2xl font-black text-slate-900">Teams</h1>
                 </div>
              </div>
              <button onClick={() => setTeamForm({ open: true, name: "", icon: "🏆" })} className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors">
                <Plus className="w-5 h-5" strokeWidth={3} />
              </button>
            </header>

            <div className="px-6 py-4 space-y-4">
              {teams.length === 0 ? (
                <div className="text-center py-10">
                   <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                   <p className="text-lg font-black text-slate-700">No teams yet</p>
                   <p className="text-sm font-medium text-slate-500 mt-1">Create a team to track peer progress!</p>
                </div>
              ) : (
                teams.map(team => (
                  <div key={team.id} className="bg-white rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 border-2 border-indigo-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">{team.icon}</div>
                        <div>
                          <h3 className="font-black text-lg text-slate-800 leading-tight">{team.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Invite Code</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black tracking-widest shadow-sm">
                          {team.inviteCode}
                        </div>
                        <button
                          onClick={() => handleShareTeam(team)}
                          title="Share Team Join Link"
                          className="px-3 py-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-purple-200 shadow-sm"
                        >
                          {copiedId === team.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-black">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </>
                          )}
                        </button>
                        <button onClick={() => deleteTeam(team.id)} className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {team.members.length > 0 && (
                      <div className="flex items-center bg-slate-50 rounded-xl p-3">
                        <div className="flex -space-x-3 mr-3">
                          {team.members.map((member: any) => (
                            <div key={member.id} className="w-8 h-8 rounded-full border-2 border-slate-50 bg-white flex items-center justify-center text-sm shadow-sm z-10" title={member.name}>
                              {getEmoji(member.avatar)}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-slate-600">{team.members.length} member{team.members.length !== 1 && 's'} joined</span>
                      </div>
                    )}
                    {team.members.length === 0 && (
                      <div className="text-xs font-bold text-slate-400 bg-slate-50 p-3 rounded-xl flex items-center justify-between">
                        <span>Share the invite code or link to let members join!</span>
                        <button onClick={() => handleShareTeam(team)} className="text-purple-600 hover:underline font-black flex items-center gap-1">
                          <Share2 className="w-3 h-3" /> {copiedId === team.id ? "Copied!" : "Copy Link"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="animate-fade-in pb-10">
            <header className="px-6 pt-10 pb-6">
              <h1 className="text-3xl font-black text-slate-900 ">Settings</h1>
              <p className="text-sm font-semibold text-slate-500 mt-1">Manage your account and preferences</p>
            </header>

            <div className="px-6 space-y-6">
               {/* Profile Card */}
               <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-50 ">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-2xl">👩</div>
                     <div>
                        <h4 className="font-black text-base text-slate-900 ">{parent.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{parent.email}</p>
                     </div>
                  </div>
                  <button className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2">
                     <Edit2 className="w-4 h-4" /> Edit Profile
                  </button>
               </div>

               {/* Account List */}
               <div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 ml-1">Account</h3>
                  <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-50 divide-y divide-slate-100">
                     <div onClick={onLogout} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><LogOut className="w-4 h-4 text-slate-600" /></div>
                           <span className="font-bold text-slate-700 text-sm">Sign Up / Log In</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                     </div>
                     <div onClick={() => setActiveTab("heroes")} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Users className="w-4 h-4 text-slate-600" /></div>
                           <span className="font-bold text-slate-700 text-sm">Linked Children</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{children.length}</span>
                           <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* AI Recommendations */}
               <div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 ml-1 flex items-center gap-1">✨ AI Recommendations</h3>
                  <div className="space-y-4">
                     <div className="gradient-card-purple flex items-center gap-4" onClick={() => setShowAiPlannerModal(true)}>
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                           <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                           <h4 className="font-black text-base text-white flex items-center gap-1">AI Habit Planner <Sparkles className="w-3 h-3 text-yellow-300" /></h4>
                           <p className="text-xs text-white/90 mt-1 leading-tight font-medium">Get personalized habit plans for your child based on age and goals</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/50" />
                     </div>
                     
                     <div className="gradient-card-orange flex items-center gap-4" onClick={() => setShowAiAssistantModal(true)}>
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                           <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                           <h4 className="font-black text-base text-white flex items-center gap-1">Parent Assistance <Sparkles className="w-3 h-3 text-yellow-100" /></h4>
                           <p className="text-xs text-white/90 mt-1 leading-tight font-medium">Ask our AI assistant for parenting tips and habit guidance</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/50" />
                     </div>
                  </div>
               </div>

               {/* Logout */}
               <button onClick={onLogout} className="w-full py-3.5 mt-4 rounded-xl bg-red-50 text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                 <LogOut className="w-4 h-4" /> Log Out
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe pt-2 px-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-2xl mx-auto flex justify-between items-center px-4">
          {navItems.map((item) => (
            <div key={item.id} onClick={() => { setActiveTab(item.id); if(item.id === "tasks") setManageSubTab("tasks"); }} className={`bottom-nav-item ${activeTab === item.id || (item.id === "tasks" && (activeTab === "rewards" || activeTab === "verify")) ? "active" : ""}`}>
              <div className="relative">
                {item.icon}
                {item.alert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
              </div>
              <span className="text-[10px] font-bold mt-1">{item.label}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* ── AI MODALS (Full Screen Scrollable) ── */}
      {showAiPlannerModal && createPortal(
         <div className="fixed inset-0 z-50 bg-[#1d1e22]/90 backdrop-blur-sm flex justify-center p-4 overflow-y-auto pt-20 pb-20">
            <button onClick={() => setShowAiPlannerModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"><X className="w-6 h-6" /></button>
            <div className="w-full max-w-lg">
               <h2 className="text-2xl font-black text-white mb-6">AI Habit Planner</h2>
               <form onSubmit={handleAIPlan} className="space-y-4">
                  <textarea value={plannerPrompt} onChange={(e) => setPlannerPrompt(e.target.value)} className="w-full h-24 bg-white/10 text-white rounded-xl p-4 font-medium outline-none border border-white/20 focus:border-purple-400 placeholder-white/50" placeholder="E.g. My child needs a better morning routine..." />
                  <button disabled={saving} type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-sm shadow-lg shadow-purple-500/30">Generate Plan</button>
               </form>
               
               {aiPlanResult && (
                  <div className="mt-8 animate-fade-in flex justify-center">
                     <div className="code-editor">
                        <div className="header">
                           <span className="title">AI_PLAN.json</span>
                        </div>
                        <div className="editor-content">
                           {JSON.stringify(aiPlanResult, null, 2)}
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>, document.body
      )}

      {showAiAssistantModal && createPortal(
         <div className="fixed inset-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-md flex justify-center p-4 overflow-y-auto pt-20 pb-20">
            <button onClick={() => setShowAiAssistantModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"><X className="w-6 h-6" /></button>
            <div className="w-full max-w-lg">
               <h2 className="text-2xl font-black text-white mb-6">Parent Assistance</h2>
               <form onSubmit={handleAIAdvice} className="space-y-4">
                  <textarea value={assistantQ} onChange={(e) => setAssistantQ(e.target.value)} className="w-full h-24 bg-white/5 text-white rounded-xl p-4 font-medium outline-none border border-white/10 focus:border-orange-400 placeholder-white/30" placeholder="Ask a parenting question..." />
                  <button disabled={saving} type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-black text-sm shadow-lg shadow-orange-500/30">Ask AI</button>
               </form>
               
               {aiAdvice && (
                  <div className="mt-8 flex justify-center animate-fade-in">
                     <div className="glowing-card-container" style={{ width: '100%', maxWidth: '350px' }}>
                        <div className="canvas">
                           {Array.from({ length: 25 }).map((_, i) => (
                              <div key={i} className={`tracker tr-${i + 1}`}></div>
                           ))}
                        </div>
                        <div id="card">
                           <p id="prompt">ADVICE READY</p>
                           <div className="title">AI<br/>ASSIST</div>
                           <div className="glowing-elements">
                              <div className="glow-1"></div>
                              <div className="glow-2"></div>
                              <div className="glow-3"></div>
                           </div>
                           <div className="card-particles">
                              <span></span><span></span><span></span><span></span><span></span><span></span>
                           </div>
                           <div className="card-content">
                              {aiAdvice}
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>, document.body
      )}

      {/* ── FORMS MODALS (unchanged functionally) ── */}
      {childForm.open && (
        <Modal title={childForm.isEdit ? "Edit Hero" : "Add Hero"} emoji="🛡️" onClose={() => setChildForm(emptyChildForm)}>
          <form onSubmit={handleChildSubmit} className="space-y-4">
            <FormField label="Name" value={childForm.name} onChange={v => setChildForm({ ...childForm, name: v })} placeholder="e.g. Leo" required />
            <FormField label="Login ID" value={childForm.loginId} onChange={v => setChildForm({ ...childForm, loginId: v.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} placeholder="e.g. leo" required />
            <FormField label="Password" type="password" value={childForm.password} onChange={v => setChildForm({ ...childForm, password: v })} placeholder="Secret password" required={!childForm.isEdit} />
            <div className="flex gap-4">
               <div className="flex-1">
                  <FormField label="Age (Years)" type="number" value={childForm.age.toString()} onChange={v => setChildForm({ ...childForm, age: parseInt(v) || 7 })} placeholder="e.g. 7" required />
               </div>
               <div className="flex-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Gender</label>
                  <select value={childForm.gender} onChange={e => setChildForm({ ...childForm, gender: e.target.value })} className="select w-full">
                    <option value="boy">👦 Boy</option>
                    <option value="girl">👧 Girl</option>
                  </select>
               </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Avatar</label>
              <select value={childForm.avatar} onChange={e => setChildForm({ ...childForm, avatar: e.target.value })} className="select">
                {avatars.map(a => <option key={a.key} value={a.key}>{a.icon} {a.name}</option>)}
              </select>
            </div>
            <button disabled={saving} type="submit" className="btn btn-blue w-full py-4">{saving ? "Saving..." : "Save"}</button>
          </form>
        </Modal>
      )}

      {questForm.open && (
        <Modal title={questForm.isEdit ? "Edit Task" : "Add Task"} emoji="📋" onClose={() => setQuestForm(emptyQuestForm)}>
          <form onSubmit={handleQuestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Child</label>
              <select value={questForm.childId} onChange={e => setQuestForm({ ...questForm, childId: e.target.value })} required className="select">
                <option value="">Select...</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <FormField label="Task Name" value={questForm.title} onChange={v => setQuestForm({ ...questForm, title: v })} placeholder="e.g. Brush Teeth" required />
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Task Category <span className="text-blue-400 normal-case font-semibold">(used for badges)</span></label>
              <select value={(questForm as any).category} onChange={e => setQuestForm({ ...questForm, category: e.target.value } as any)} className="select">
                <option value="general">🎯 General</option>
                <option value="reading">📖 Reading</option>
                <option value="homework">📚 Homework / Study</option>
                <option value="health">❤️ Health / Hygiene</option>
                <option value="fitness">💪 Fitness / Sports</option>
                <option value="chores">🏠 Chores</option>
              </select>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Difficulty</label>
                <div className="uiverse-radio-container">
                  {["easy", "medium", "hard"].map(diff => (
                    <div key={diff}>
                      <input type="radio" id={`diff-${diff}`} name="difficulty" value={diff} checked={questForm.difficulty === diff} onChange={e => setQuestForm({ ...questForm, difficulty: e.target.value })} className="uiverse-radio" />
                      <label htmlFor={`diff-${diff}`} className="uiverse-radio-label capitalize">{diff}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Proof Required</label>
                <div className="uiverse-radio-container">
                  {["none", "photo", "text"].map(p => (
                    <div key={p}>
                      <input type="radio" id={`proof-${p}`} name="proof" value={p} checked={questForm.requireProof === p} onChange={e => setQuestForm({ ...questForm, requireProof: e.target.value })} className="uiverse-radio" />
                      <label htmlFor={`proof-${p}`} className="uiverse-radio-label capitalize">{p}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button disabled={saving} type="submit" className="btn btn-green w-full py-4">{saving ? "Saving..." : "Save"}</button>
          </form>
        </Modal>
      )}

      {rewardForm.open && (
        <Modal title="Add Reward" emoji="🎁" onClose={() => setRewardForm(emptyRewardForm)}>
          <form onSubmit={handleRewardSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Child</label>
              <select value={rewardForm.childId} onChange={e => setRewardForm({ ...rewardForm, childId: e.target.value })} required className="select">
                <option value="">Select...</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <FormField label="Reward" value={rewardForm.title} onChange={v => setRewardForm({ ...rewardForm, title: v })} placeholder="e.g. 30min TV" required />
            <FormField label="Cost (coins)" type="number" value={rewardForm.coinsCost} onChange={v => setRewardForm({ ...rewardForm, coinsCost: v })} placeholder="30" required />
            <button disabled={saving} type="submit" className="btn btn-yellow w-full py-4">{saving ? "Saving..." : "Save"}</button>
          </form>
        </Modal>
      )}

      {teamForm.open && (
        <Modal title="New Team" emoji={teamForm.icon} onClose={() => setTeamForm({ ...teamForm, open: false })}>
          <form onSubmit={handleTeamSubmit} className="space-y-4">
            <FormField label="Team Name" value={teamForm.name} onChange={v => setTeamForm({ ...teamForm, name: v })} placeholder="e.g. Family Heroes" required />
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {["🏆", "⭐", "🚀", "🛡️", "🔥", "💎"].map(icon => (
                  <button key={icon} type="button" onClick={() => setTeamForm({ ...teamForm, icon })} className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${teamForm.icon === icon ? 'bg-indigo-100 border-2 border-indigo-400 scale-110' : 'bg-slate-50 border-2 border-slate-100 hover:bg-slate-100'}`}>{icon}</button>
                ))}
              </div>
            </div>
            <button disabled={saving} type="submit" className="btn btn-indigo w-full py-4">{saving ? "Saving..." : "Create Team"}</button>
          </form>
        </Modal>
      )}

      {rejectModal.open && (
        <Modal title="Reject Task" emoji="⚠️" onClose={() => setRejectModal({ open: false, questId: "", comment: "" })}>
          <form onSubmit={rejectQuest} className="space-y-4">
            <p className="text-sm font-bold text-slate-500">Give feedback so they can try again.</p>
            <textarea required value={rejectModal.comment} onChange={e => setRejectModal({ ...rejectModal, comment: e.target.value })} className="input h-24 resize-none" placeholder="E.g. Please also clean under the bed!" />
            <button type="submit" className="btn btn-red w-full py-4">Send Feedback</button>
          </form>
        </Modal>
      )}

      {/* ── HERO DETAILS VIEW & CALENDAR ── */}
      {selectedHero && (
         <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-slide-up overflow-y-auto">
            {/* Header */}
            <div className={`pt-12 pb-6 px-6 ${selectedHero.gender === 'girl' ? 'bg-[#fce6f3]' : 'bg-[#e6f0fa]'} relative`}>
               <button onClick={() => setSelectedHero(null)} className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/50 flex items-center justify-center hover:bg-white transition-colors">
                  <ChevronLeft className="w-6 h-6 text-slate-700" />
               </button>
               <div className="flex flex-col items-center text-center mt-6">
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center text-5xl mb-4 relative z-10">
                     {getEmoji(selectedHero.avatar)}
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">{selectedHero.name}</h2>
                  <p className="text-sm text-slate-500 font-bold mb-4">{selectedHero.age || 7} years old</p>
                  
                  <div className="flex gap-3 justify-center">
                     <div className="bg-white px-4 py-2 rounded-2xl shadow-sm text-sm font-black text-slate-700 flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-purple-500 fill-purple-500" /> Lvl {selectedHero.level || 1}
                     </div>
                     <div className="bg-white px-4 py-2 rounded-2xl shadow-sm text-sm font-black text-slate-700 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> {selectedHero.xp} XP
                     </div>
                     <div className="bg-white px-4 py-2 rounded-2xl shadow-sm text-sm font-black text-slate-700 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> {selectedHero.streak} Days
                     </div>
                  </div>
               </div>
            </div>

            {/* Content Tabs for Tasks and Rewards */}
            <div className="px-6 py-6 flex-1 bg-slate-50">
               <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" /> Tasks ({quests.filter(q => q.childId === selectedHero.id).length})
               </h3>
               <div className="space-y-4 mb-8">
                  {quests.filter(q => q.childId === selectedHero.id).map(q => {
                     const isExpanded = selectedTaskHistory === q.id;
                     const historyRecords = questHistory.filter(h => h.questId === q.id && h.status === 'verified');
                     
                     // Helper to check if a task was completed on a specific day
                     const wasCompletedOn = (d: Date) => {
                        const dateStr = d.toISOString().split('T')[0];
                        return historyRecords.some(h => h.completedAt && h.completedAt.startsWith(dateStr));
                     };

                     // Generate days for current month calendar
                     const now = new Date();
                     const year = now.getFullYear();
                     const month = now.getMonth();
                     const daysInMonth = new Date(year, month + 1, 0).getDate();
                     const calendarDays = Array.from({length: daysInMonth}, (_, i) => new Date(year, month, i + 1));

                     return (
                        <div key={q.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 overflow-hidden">
                           <div className="flex justify-between items-center cursor-pointer" onClick={() => setSelectedTaskHistory(isExpanded ? null : q.id)}>
                              <div>
                                 <h4 className="font-bold text-slate-900">{q.title}</h4>
                                 <p className="text-xs font-semibold text-slate-400 mt-0.5">{q.repetition} • {q.xp} XP</p>
                              </div>
                              <button className={`p-2 rounded-full ${isExpanded ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'} hover:bg-blue-100 transition-colors`}>
                                 <CalendarIcon className="w-5 h-5" />
                              </button>
                           </div>

                           {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
                                 <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Completion History (This Month)</h5>
                                 <div className="grid grid-cols-7 gap-2">
                                    {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[9px] font-bold text-slate-400">{d}</div>)}
                                    {/* Offset for start of month */}
                                    {Array.from({length: new Date(year, month, 1).getDay()}).map((_, i) => <div key={`empty-${i}`} />)}
                                    {calendarDays.map(d => {
                                       const completed = wasCompletedOn(d);
                                       const isToday = d.toDateString() === new Date().toDateString();
                                       return (
                                          <div key={d.getDate()} className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold mx-auto
                                             ${completed ? 'bg-green-500 text-white shadow-sm shadow-green-500/30' : 
                                               isToday ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-slate-50 text-slate-400'}`}>
                                             {d.getDate()}
                                          </div>
                                       );
                                    })}
                                 </div>
                                 <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-xl">
                                    <Flame className="w-4 h-4 text-orange-500" /> Total Completions: {historyRecords.length}
                                 </div>
                              </div>
                           )}
                        </div>
                     );
                  })}
                  {quests.filter(q => q.childId === selectedHero.id).length === 0 && (
                     <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm font-bold text-slate-400">No tasks assigned yet.</p>
                     </div>
                  )}
               </div>

               <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" /> Rewards ({rewards.filter(r => r.childId === selectedHero.id).length})
               </h3>
               <div className="space-y-4">
                  {rewards.filter(r => r.childId === selectedHero.id).map(r => (
                     <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
                        <div>
                           <h4 className="font-bold text-slate-900">{r.title}</h4>
                           <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase mt-1 ${
                              r.status === 'approved' ? 'bg-green-100 text-green-600' :
                              r.status === 'requested' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-slate-100 text-slate-500'
                           }`}>{r.status}</span>
                        </div>
                        <div className="bg-yellow-50 px-3 py-1.5 rounded-xl flex items-center gap-1 font-black text-yellow-600 text-sm">
                           🪙 {r.coinsCost}
                        </div>
                     </div>
                  ))}
                  {rewards.filter(r => r.childId === selectedHero.id).length === 0 && (
                     <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm font-bold text-slate-400">No rewards added yet.</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
    </>
  );
}

// ── Helper Components ──
const FormField = ({ label, type = "text", value, onChange, placeholder, required }: any) => (
  <div>
    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} className="input" />
  </div>
);

const Modal = ({ title, emoji, children, onClose }: any) => createPortal(
  <div className="modal-overlay animate-fade-in z-[60]">
    <div className="modal-card relative max-w-sm w-full mx-4">
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200">
        <X className="w-5 h-5" />
      </button>
      <div className="text-center mb-5">
        <p className="text-5xl mb-2">{emoji}</p>
        <h3 className="text-xl font-black text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  </div>,
  document.body
);
