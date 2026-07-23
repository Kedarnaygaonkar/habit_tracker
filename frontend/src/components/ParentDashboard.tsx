import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  BarChart2,
  Check,
  Compass,
  Edit2,
  Flame,
  Gift,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  X,
  TrendingUp,
  Star,
  Zap,
  ShieldCheck,
} from "lucide-react";

interface ParentDashboardProps {
  token: string;
  parent: { id: string; name: string; email: string };
  onLogout: () => void;
}

type Tab = "analytics" | "children" | "quests" | "rewards" | "verifications" | "ai-tools";

const emptyChildForm = {
  open: false,
  isEdit: false,
  id: "",
  name: "",
  loginId: "",
  password: "",
  avatar: "avatar_knight",
};

const emptyQuestForm = {
  open: false,
  isEdit: false,
  id: "",
  childId: "",
  title: "",
  difficulty: "medium",
  repetition: "daily",
  reminderTime: "08:00",
  requireProof: "none",
};

const emptyRewardForm = {
  open: false,
  childId: "",
  title: "",
  coinsCost: "30",
};

export default function ParentDashboard({ token, parent, onLogout }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("children");
  const [children, setChildren] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [childForm, setChildForm] = useState(emptyChildForm);
  const [questForm, setQuestForm] = useState(emptyQuestForm);
  const [rewardForm, setRewardForm] = useState(emptyRewardForm);
  const [rejectQuestModal, setRejectQuestModal] = useState({ open: false, questId: "", comment: "" });
  const [saving, setSaving] = useState(false);

  const [plannerPrompt, setPlannerPrompt] = useState("My child needs a better morning and homework routine.");
  const [aiPlanResult, setAiPlanResult] = useState<any | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState("How do I encourage homework without constant reminders?");
  const [aiAdviceResult, setAiAdviceResult] = useState<string | null>(null);
  const [selectedChildForReport, setSelectedChildForReport] = useState("");
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);

  const avatars = [
    { key: "avatar_knight", name: "Noble Knight", icon: "🛡️" },
    { key: "avatar_wizard", name: "Reading Wizard", icon: "🔮" },
    { key: "avatar_ninja", name: "Agile Ninja", icon: "🥷" },
    { key: "avatar_ranger", name: "Nature Ranger", icon: "🏹" },
    { key: "avatar_unicorn", name: "Magic Unicorn", icon: "🦄" },
  ];

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const authHeaders = { Authorization: `Bearer ${token}` };

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  };

  const getAvatarEmoji = (key: string) => avatars.find((avatar) => avatar.key === key)?.icon || "👤";

  const childName = (id: string) => children.find((child) => child.id === id)?.name || "Unknown child";

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [childrenRes, questsRes, rewardsRes, dashboardRes] = await Promise.all([
        fetch("/api/parent/children", { headers: authHeaders }),
        fetch("/api/quests", { headers: authHeaders }),
        fetch("/api/rewards", { headers: authHeaders }),
        fetch("/api/parent/dashboard", { headers: authHeaders }),
      ]);

      if (!childrenRes.ok) throw new Error("Could not load children.");
      if (!questsRes.ok) throw new Error("Could not load quests.");
      if (!rewardsRes.ok) throw new Error("Could not load rewards.");

      const childrenData = await childrenRes.json();
      const questsData = await questsRes.json();
      const rewardsData = await rewardsRes.json();
      const dashboardData = dashboardRes.ok ? await dashboardRes.json() : {};

      setChildren(Array.isArray(childrenData) ? childrenData : []);
      setQuests(Array.isArray(questsData) ? questsData : []);
      setRewards(Array.isArray(rewardsData) ? rewardsData : []);
      setReports(Array.isArray(dashboardData.reports) ? dashboardData.reports : []);
    } catch (err: any) {
      setError(err.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChildSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = childForm.isEdit ? `/api/parent/children/${childForm.id}` : "/api/parent/children";
      const method = childForm.isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: childForm.name,
          loginId: childForm.loginId,
          password: childForm.password,
          avatar: childForm.avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save child.");
      setChildForm(emptyChildForm);
      await fetchData();
      showMessage(childForm.isEdit ? "Hero updated successfully." : "New hero created!");
    } catch (err: any) {
      setError(err.message || "Could not save child.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuestSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = questForm.isEdit ? `/api/parent/quests/${questForm.id}` : "/api/parent/quests";
      const method = questForm.isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          childId: questForm.childId,
          title: questForm.title,
          difficulty: questForm.difficulty,
          repetition: questForm.repetition,
          reminderTime: questForm.reminderTime,
          requireProof: questForm.requireProof,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save quest.");
      setQuestForm(emptyQuestForm);
      await fetchData();
      showMessage(questForm.isEdit ? "Quest updated." : "Quest assigned! ⚔️");
    } catch (err: any) {
      setError(err.message || "Could not save quest.");
    } finally {
      setSaving(false);
    }
  };

  const handleRewardSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/parent/rewards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          childId: rewardForm.childId,
          title: rewardForm.title,
          coinsCost: rewardForm.coinsCost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create reward.");
      setRewardForm(emptyRewardForm);
      await fetchData();
      showMessage("Reward created! 🎁");
    } catch (err: any) {
      setError(err.message || "Could not create reward.");
    } finally {
      setSaving(false);
    }
  };

  const deleteChild = async (id: string) => {
    if (!confirm("Delete this child and all related data?")) return;
    const res = await fetch(`/api/parent/children/${id}`, { method: "DELETE", headers: authHeaders });
    if (res.ok) {
      await fetchData();
      showMessage("Hero deleted.");
    }
  };

  const deleteQuest = async (id: string) => {
    if (!confirm("Delete this quest?")) return;
    const res = await fetch(`/api/parent/quests/${id}`, { method: "DELETE", headers: authHeaders });
    if (res.ok) {
      await fetchData();
      showMessage("Quest deleted.");
    }
  };

  const verifyQuest = async (id: string) => {
    const res = await fetch(`/api/parent/quests/${id}/verify`, { method: "POST", headers: authHeaders });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not verify quest.");
      return;
    }
    await fetchData();
    showMessage("Quest verified! XP and coins awarded. ✅");
  };

  const rejectQuest = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch(`/api/parent/quests/${rejectQuestModal.questId}/reject`, {
      method: "POST",
      headers,
      body: JSON.stringify({ comment: rejectQuestModal.comment }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not reject quest.");
      return;
    }
    setRejectQuestModal({ open: false, questId: "", comment: "" });
    await fetchData();
    showMessage("Quest sent back with feedback.");
  };

  const approveReward = async (id: string) => {
    const res = await fetch(`/api/parent/rewards/${id}/approve`, { method: "POST", headers: authHeaders });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not approve reward.");
      return;
    }
    await fetchData();
    showMessage("Reward approved! 🎉");
  };

  const rejectReward = async (id: string) => {
    const res = await fetch(`/api/parent/rewards/${id}/reject`, {
      method: "POST",
      headers,
      body: JSON.stringify({ comment: "Not approved yet." }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not reject reward.");
      return;
    }
    await fetchData();
    showMessage("Reward rejected and coins refunded.");
  };

  const handleAIPlanSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch("/api/ai/plan", { method: "POST", headers, body: JSON.stringify({ description: plannerPrompt }) });
    setAiPlanResult(await res.json());
  };

  const handleAIAssistantSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch("/api/ai/assistant", { method: "POST", headers, body: JSON.stringify({ question: assistantQuestion }) });
    const data = await res.json();
    setAiAdviceResult(data.advice || "No advice returned.");
  };

  const handleAIReportSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch("/api/ai/report", { method: "POST", headers, body: JSON.stringify({ childId: selectedChildForReport }) });
    setGeneratedReport(await res.json());
    await fetchData();
  };

  const pendingQuests = quests.filter((quest) => quest.status === "completed");
  const requestedRewards = rewards.filter((reward) => reward.status === "requested");

  const openQuestForChild = (childId: string) => {
    setError("");
    setActiveTab("quests");
    setQuestForm({ ...emptyQuestForm, open: true, childId });
  };

  const openRewardForChild = (childId: string) => {
    setError("");
    setActiveTab("rewards");
    setRewardForm({ ...emptyRewardForm, open: true, childId });
  };

  const navItems = [
    { id: "analytics" as Tab, label: "Progress & Stats", icon: BarChart2, emoji: "📊", count: children.length, alert: false },
    { id: "children" as Tab, label: "Manage Heroes", icon: Users, emoji: "👨‍👩‍👧", count: children.length, alert: false },
    { id: "quests" as Tab, label: "Quest Master", icon: Compass, emoji: "⚔️", count: quests.length, alert: false },
    { id: "rewards" as Tab, label: "Rewards Shop", icon: Gift, emoji: "🎁", count: rewards.length, alert: requestedRewards.length > 0 },
    { id: "verifications" as Tab, label: "Verifications", icon: Check, emoji: "✅", count: pendingQuests.length, alert: pendingQuests.length > 0 },
    { id: "ai-tools" as Tab, label: "AI Parenting Hub", icon: Sparkles, emoji: "🤖", count: reports.length, alert: false },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-slate-800 md:flex">
      {/* ── TOAST ── */}
      {message && (
        <div className="fixed right-4 top-4 z-[10000] toast-success flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          {message}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="sidebar-dark w-full md:w-72 md:min-h-screen sticky top-0 z-50 flex flex-col shadow-2xl">
        {/* Brand */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6C3DE0, #4f46e5)', boxShadow: '0 0 20px rgba(108,61,224,0.5)' }}>
              🏰
              <div className="absolute inset-0 shimmer-bg" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-white">HabitQuest</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Parent Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onLogout} className="md:hidden p-2 rounded-xl transition cursor-pointer" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </button>
            <button type="button" onClick={fetchData} className="p-2 rounded-xl transition cursor-pointer" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Family info */}
        <div className="hidden md:block px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Family</p>
          <p className="text-sm font-black" style={{ color: '#a78bfa' }}>The {parent.name} Family</p>
        </div>

        {/* Nav */}
        <nav className="flex overflow-x-auto gap-1.5 p-3 md:flex-col md:p-4 md:space-y-1 border-b md:border-b-0 scrollbar-hide" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-nav-item ${isActive ? "active" : ""} shrink-0`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base leading-none hidden md:inline">{item.emoji}</span>
                  <Icon className="h-4 w-4 md:hidden" />
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {item.alert && (
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  )}
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: isActive ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)', color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                    {item.count}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Logout (desktop) */}
        <div className="hidden md:block mt-auto p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="mb-3 truncate text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>{parent.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wide cursor-pointer transition"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
          >
            <LogOut className="h-4 w-4" /> Sign Out Family
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 p-5 md:p-8 overflow-auto">
        {error && (
          <div className="mb-5 rounded-2xl p-4 text-sm font-bold flex items-center gap-2" style={{ background: '#fef2f2', border: '2px solid #fecaca', color: '#dc2626' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && (
          <section className="space-y-6 animate-fade-in">
            <SectionHeader title="Progress & Stats" subtitle="Family habit progress at a glance" emoji="📊" />
            <div className="grid gap-5 md:grid-cols-3">
              <MetricCard label="Children" value={children.length} color="#6C3DE0" emoji="👨‍👩‍👧" bg="from-violet-50 to-white" />
              <MetricCard label="Active Quests" value={quests.length} color="#0ea5e9" emoji="⚔️" bg="from-sky-50 to-white" />
              <MetricCard label="Rewards" value={rewards.length} color="#f59e0b" emoji="🎁" bg="from-amber-50 to-white" />
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="panel">
                <h3 className="panel-title mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-500" /> Family Overview
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Pending Quest Verifications", value: pendingQuests.length, color: pendingQuests.length > 0 ? '#f59e0b' : '#22c55e', icon: '⏳' },
                    { label: "Reward Requests Awaiting", value: requestedRewards.length, color: requestedRewards.length > 0 ? '#f59e0b' : '#22c55e', icon: '🎁' },
                    { label: "Total Heroes", value: children.length, color: '#6C3DE0', icon: '🛡️' },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <span>{icon}</span> {label}
                      </span>
                      <span className="text-lg font-black" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <h3 className="panel-title mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Hero Leaderboard
                </h3>
                {children.length === 0 ? (
                  <p className="text-center text-sm font-bold text-slate-400 py-8">No heroes yet. Add your first child!</p>
                ) : (
                  <div className="space-y-2">
                    {[...children].sort((a, b) => (b.xp || 0) - (a.xp || 0)).map((child, idx) => (
                      <div key={child.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <span className="text-lg font-black w-6 text-center" style={{ color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#b45309' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="text-xl">{getAvatarEmoji(child.avatar)}</span>
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-700">{child.name}</p>
                          <p className="text-xs font-bold text-slate-400">Level {child.level} · {child.streak || 0}d streak</p>
                        </div>
                        <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ background: 'rgba(108,61,224,0.08)', color: '#6C3DE0' }}>
                          {child.xp || 0} XP
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── CHILDREN ── */}
        {activeTab === "children" && (
          <section className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader title="Manage Heroes" subtitle="Add children, customize profiles, set login ID and password" emoji="👨‍👩‍👧" />
              <button type="button" onClick={() => setChildForm({ ...emptyChildForm, open: true })} className="primary-button">
                <Plus className="h-4 w-4" /> Add Hero Child
              </button>
            </div>

            {children.length === 0 ? (
              <div className="panel text-center py-16">
                <div className="text-5xl mb-4">👨‍👩‍👧</div>
                <p className="text-sm font-black uppercase text-slate-400">No heroes yet. Add your first child!</p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {children.map((child) => (
                  <article key={child.id} className="hero-card overflow-hidden">
                    {/* Colored header band */}
                    <div className="h-20 relative flex items-end px-6 pb-0" style={{ background: 'linear-gradient(135deg, #0f0a28, #1a1040)' }}>
                      <div className="absolute inset-0 shimmer-bg" />
                      <div className="flex gap-2 absolute top-3 right-3">
                        <button type="button" onClick={() => setChildForm({ open: true, isEdit: true, id: child.id, name: child.name, loginId: child.loginId || "", password: "", avatar: child.avatar })} className="icon-button" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => deleteChild(child.id)} className="icon-button" style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {/* Avatar floating over band */}
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl relative z-10 -mb-8 shadow-xl" style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                        {getAvatarEmoji(child.avatar)}
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-5 pt-10">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-black text-slate-800">{child.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-black" style={{ background: 'rgba(108,61,224,0.08)', color: '#6C3DE0', border: '1px solid rgba(108,61,224,0.15)' }}>
                              Level {child.level}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#ef4444' }}>
                              <Flame className="h-3.5 w-3.5" /> {child.streak || 0}d streak
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400">Login ID</p>
                          <code className="text-sm font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">{child.loginId}</code>
                        </div>
                      </div>

                      {/* Pet info */}
                      <div className="flex items-center justify-between rounded-2xl px-4 py-3 mb-4" style={{ background: 'linear-gradient(135deg, #f8faff, #f0f4ff)', border: '1px solid #e2e8f0' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🐾</span>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#6C3DE0' }}>Pet Buddy</p>
                            <p className="text-sm font-black text-slate-700">{child.pet?.name || "Mochi the Bunny"}</p>
                          </div>
                        </div>
                        <span className="rounded-xl px-3 py-1.5 text-xs font-black" style={{ background: 'rgba(108,61,224,0.08)', color: '#6C3DE0', border: '1px solid rgba(108,61,224,0.15)' }}>
                          Lvl {child.pet?.level || 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => openQuestForChild(child.id)} className="secondary-button text-sky-600 gap-1.5">
                          <Compass className="h-3.5 w-3.5" /> Assign Quest
                        </button>
                        <button type="button" onClick={() => openRewardForChild(child.id)} className="secondary-button gap-1.5" style={{ color: '#22c55e' }}>
                          <Gift className="h-3.5 w-3.5" /> Create Reward
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── QUESTS ── */}
        {activeTab === "quests" && (
          <section className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader title="Quest Master Board" subtitle="Create and customize quest habits for daily streaks" emoji="⚔️" />
              <button type="button" onClick={() => setQuestForm({ ...emptyQuestForm, open: true, childId: children[0]?.id || "" })} className="primary-button">
                <Plus className="h-4 w-4" /> Craft A Quest
              </button>
            </div>
            <div className="panel space-y-3">
              {quests.length === 0 ? (
                <p className="py-12 text-center text-sm font-black uppercase text-slate-400">No quests yet. Craft your first quest!</p>
              ) : (
                quests.map((quest) => (
                  <div key={quest.id}>
                    <QuestRow quest={quest} childName={childName(quest.childId)} onEdit={() => setQuestForm({ open: true, isEdit: true, id: quest.id, childId: quest.childId, title: quest.title, difficulty: quest.difficulty, repetition: quest.repetition, reminderTime: quest.reminderTime, requireProof: quest.requireProof })} onDelete={() => deleteQuest(quest.id)} />
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ── REWARDS ── */}
        {activeTab === "rewards" && (
          <section className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader title="Rewards Shop Board" subtitle="Create rewards children can claim with coins" emoji="🎁" />
              <button type="button" onClick={() => setRewardForm({ ...emptyRewardForm, open: true, childId: children[0]?.id || "" })} className="primary-button">
                <Plus className="h-4 w-4" /> Stock Reward
              </button>
            </div>
            <div className="panel space-y-3">
              {rewards.length === 0 ? (
                <p className="py-12 text-center text-sm font-black uppercase text-slate-400">No rewards yet. Stock your first reward!</p>
              ) : (
                rewards.map((reward) => (
                  <div key={reward.id}>
                    <RewardRow reward={reward} childName={childName(reward.childId)} onApprove={() => approveReward(reward.id)} onReject={() => rejectReward(reward.id)} />
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ── VERIFICATIONS ── */}
        {activeTab === "verifications" && (
          <section className="space-y-6 animate-fade-in">
            <SectionHeader title="Quest Verification Queue" subtitle="Confirm completed quests and send feedback to your hero" emoji="✅" />
            <div className="panel space-y-3">
              {pendingQuests.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <p className="text-sm font-black uppercase text-slate-400">All caught up! No pending verifications.</p>
                </div>
              ) : (
                pendingQuests.map((quest) => (
                  <div key={quest.id} className="row-card">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                        ⚔️
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{quest.adventureTitle || quest.title}</p>
                        <p className="text-xs font-bold text-slate-400">
                          {childName(quest.childId)} · <span className="text-slate-500">{quest.title}</span> ·
                          <span className={`ml-1 font-black ${quest.difficulty === 'easy' ? 'text-green-500' : quest.difficulty === 'medium' ? 'text-amber-500' : 'text-red-500'}`}>
                            {quest.difficulty}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => verifyQuest(quest.id)} className="small-green flex items-center gap-1">
                        <Check className="w-3 h-3" /> Verify
                      </button>
                      <button type="button" onClick={() => setRejectQuestModal({ open: true, questId: quest.id, comment: "" })} className="small-red flex items-center gap-1">
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ── AI TOOLS ── */}
        {activeTab === "ai-tools" && (
          <section className="space-y-6 animate-fade-in">
            <SectionHeader title="AI Parenting Hub" subtitle="Generate plans, get expert advice, and create child reports" emoji="🤖" />

            <div className="grid gap-6 lg:grid-cols-2">
              {/* AI Habit Planner */}
              <form onSubmit={handleAIPlanSubmit} className="panel space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(108,61,224,0.1)', border: '1px solid rgba(108,61,224,0.2)' }}>
                    <Zap className="w-4 h-4 text-violet-500" />
                  </div>
                  <h3 className="panel-title">AI Habit Planner</h3>
                </div>
                <p className="text-xs text-slate-500 font-semibold">Describe your child's needs and get a full daily routine.</p>
                <textarea value={plannerPrompt} onChange={(e) => setPlannerPrompt(e.target.value)} className="field h-28" />
                <button className="primary-button" type="submit">
                  <Sparkles className="w-3.5 h-3.5" /> Generate Plan
                </button>
                {aiPlanResult && (
                  <div className="space-y-3 mt-2">
                    {Object.entries(aiPlanResult).map(([key, value]) => (
                      <div key={key} className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        {Array.isArray(value) ? (
                          <ul className="space-y-1">
                            {(value as string[]).map((item, i) => (
                              <li key={i} className="text-xs font-semibold text-slate-700 flex items-start gap-2">
                                <span className="text-violet-500 mt-0.5 shrink-0">•</span> {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs font-semibold text-slate-700">{String(value)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </form>

              {/* Parent Assistant */}
              <form onSubmit={handleAIAssistantSubmit} className="panel space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                    <Award className="w-4 h-4 text-sky-500" />
                  </div>
                  <h3 className="panel-title">Parent Assistant</h3>
                </div>
                <p className="text-xs text-slate-500 font-semibold">Ask for expert parenting advice tailored to gamified habits.</p>
                <textarea value={assistantQuestion} onChange={(e) => setAssistantQuestion(e.target.value)} className="field h-28" />
                <button className="primary-button" type="submit">
                  <Sparkles className="w-3.5 h-3.5" /> Ask Assistant
                </button>
                {aiAdviceResult && (
                  <div className="result-box whitespace-pre-wrap">{aiAdviceResult}</div>
                )}
              </form>
            </div>

            {/* Weekly Report */}
            <form onSubmit={handleAIReportSubmit} className="panel space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <BarChart2 className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="panel-title">Weekly Progress Report</h3>
              </div>
              <p className="text-xs text-slate-500 font-semibold">Generate an AI-powered weekly analysis of your child's habit progress.</p>
              <select required value={selectedChildForReport} onChange={(e) => setSelectedChildForReport(e.target.value)} className="field md:w-72">
                <option value="">Choose a hero child...</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
              <button className="primary-button" type="submit">
                <Sparkles className="w-3.5 h-3.5" /> Generate Report
              </button>
              {generatedReport && (
                <div className="grid gap-3 md:grid-cols-2 mt-2">
                  {Object.entries(generatedReport).map(([key, value]) => (
                    <div key={key} className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      {Array.isArray(value) ? (
                        <ul className="space-y-1">
                          {(value as string[]).map((item, i) => (
                            <li key={i} className="text-xs font-semibold text-slate-700 flex items-start gap-2">
                              <span className="text-violet-500 mt-0.5 shrink-0">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs font-semibold text-slate-700">{String(value)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </form>
          </section>
        )}
      </main>

      {/* ── MODALS ── */}
      {childForm.open && (
        <ModalShell>
          <ModalHeader title={childForm.isEdit ? "Edit Hero Profile" : "Register New Hero"} emoji="🛡️" onClose={() => setChildForm(emptyChildForm)} />
          <form onSubmit={handleChildSubmit} className="space-y-4">
            <Field label="Hero Name" value={childForm.name} onChange={(value) => setChildForm({ ...childForm, name: value })} required placeholder="e.g. Leo, Emma" />
            <Field label="Child Login ID" value={childForm.loginId} onChange={(value) => setChildForm({ ...childForm, loginId: value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} required placeholder="e.g. leo (used to log in)" />
            <Field label="Child Password" type="password" value={childForm.password} onChange={(value) => setChildForm({ ...childForm, password: value })} required={!childForm.isEdit} placeholder={childForm.isEdit ? "Leave blank to keep current" : "Password child will use"} />
            <SelectField label="Hero Avatar Class" value={childForm.avatar} onChange={(value) => setChildForm({ ...childForm, avatar: value })} options={avatars.map((avatar) => ({ value: avatar.key, label: `${avatar.icon} ${avatar.name}` }))} />
            <button disabled={saving} type="submit" className="primary-button w-full">
              {saving ? "Saving..." : childForm.isEdit ? "Save Changes" : "Create Hero! 🏰"}
            </button>
          </form>
        </ModalShell>
      )}

      {questForm.open && (
        <ModalShell>
          <ModalHeader title={questForm.isEdit ? "Edit Quest Details" : "Craft A New Quest"} emoji="⚔️" onClose={() => setQuestForm(emptyQuestForm)} />
          <form onSubmit={handleQuestSubmit} className="space-y-4">
            <SelectField label="Assign to Hero" value={questForm.childId} onChange={(value) => setQuestForm({ ...questForm, childId: value })} options={children.map((child) => ({ value: child.id, label: `${getAvatarEmoji(child.avatar)} ${child.name}` }))} required />
            <Field label="Chore / Habit Name" value={questForm.title} onChange={(value) => setQuestForm({ ...questForm, title: value })} required placeholder="e.g. Brush Teeth, Read Book" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Difficulty" value={questForm.difficulty} onChange={(value) => setQuestForm({ ...questForm, difficulty: value })} options={[{ value: "easy", label: "⭐ Easy" }, { value: "medium", label: "⭐⭐ Medium" }, { value: "hard", label: "⭐⭐⭐ Hard" }]} />
              <SelectField label="Frequency" value={questForm.repetition} onChange={(value) => setQuestForm({ ...questForm, repetition: value })} options={[{ value: "daily", label: "📅 Daily" }, { value: "weekly", label: "📆 Weekly" }, { value: "monthly", label: "🗓️ Monthly" }]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reminder Time" type="time" value={questForm.reminderTime} onChange={(value) => setQuestForm({ ...questForm, reminderTime: value })} />
              <SelectField label="Required Proof" value={questForm.requireProof} onChange={(value) => setQuestForm({ ...questForm, requireProof: value })} options={[{ value: "none", label: "None" }, { value: "text", label: "✍️ Text" }, { value: "photo", label: "📸 Photo" }]} />
            </div>
            <button disabled={saving} type="submit" className="primary-button w-full">
              {saving ? "Saving..." : questForm.isEdit ? "Update Quest" : "Assign Quest! ⚔️"}
            </button>
          </form>
        </ModalShell>
      )}

      {rewardForm.open && (
        <ModalShell>
          <ModalHeader title="Stock A New Reward" emoji="🎁" onClose={() => setRewardForm(emptyRewardForm)} />
          <form onSubmit={handleRewardSubmit} className="space-y-4">
            <SelectField label="Assign to Hero" value={rewardForm.childId} onChange={(value) => setRewardForm({ ...rewardForm, childId: value })} options={children.map((child) => ({ value: child.id, label: `${getAvatarEmoji(child.avatar)} ${child.name}` }))} required />
            <Field label="Reward Title" value={rewardForm.title} onChange={(value) => setRewardForm({ ...rewardForm, title: value })} required placeholder="e.g. 30 Minutes TV Time" />
            <Field label="Coin Cost" type="number" value={rewardForm.coinsCost} onChange={(value) => setRewardForm({ ...rewardForm, coinsCost: value })} required min={5} placeholder="e.g. 30" />
            <button disabled={saving} type="submit" className="primary-button w-full">
              {saving ? "Saving..." : "Create Reward! 🎁"}
            </button>
          </form>
        </ModalShell>
      )}

      {rejectQuestModal.open && (
        <ModalShell>
          <ModalHeader title="Send Quest Back" emoji="↩️" onClose={() => setRejectQuestModal({ open: false, questId: "", comment: "" })} />
          <form onSubmit={rejectQuest} className="space-y-4">
            <p className="text-sm font-semibold text-slate-500">Tell your child what to improve and try again.</p>
            <textarea
              required
              value={rejectQuestModal.comment}
              onChange={(e) => setRejectQuestModal({ ...rejectQuestModal, comment: e.target.value })}
              placeholder="e.g. Great try! Please add more detail to your reading note."
              className="field h-28"
            />
            <button type="submit" className="small-red w-full py-3.5 rounded-2xl text-sm">
              Send Feedback
            </button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function SectionHeader({ title, subtitle, emoji }: { title: string; subtitle: string; emoji: string }) {
  return (
    <div>
      <h1 className="flex items-center gap-2.5 text-2xl md:text-3xl font-black text-slate-800">
        <span className="text-3xl">{emoji}</span>
        {title}
      </h1>
      <p className="mt-1.5 text-sm font-semibold text-slate-500">{subtitle}</p>
    </div>
  );
}

function MetricCard({ label, value, color, emoji, bg }: { label: string; value: number; color: string; emoji: string; bg: string }) {
  return (
    <div className="metric-card">
      <div className={`metric-card-header bg-gradient-to-r ${bg}`} style={{ background: `linear-gradient(90deg, ${color}22, ${color}11)`, height: '5px' }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
          <span className="text-2xl">{emoji}</span>
        </div>
        <p className="text-4xl font-black animate-count-up" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

function QuestRow({ quest, childName, onEdit, onDelete }: { quest: any; childName: string; onEdit: () => void; onDelete: () => void }) {
  const diffColor = quest.difficulty === 'easy' ? '#22c55e' : quest.difficulty === 'medium' ? '#f59e0b' : '#ef4444';
  return (
    <div className="row-card">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${diffColor}15`, border: `1px solid ${diffColor}30` }}>
          ⚔️
        </div>
        <div className="min-w-0">
          <p className="font-black text-slate-800 text-sm truncate">{quest.adventureTitle || quest.title}</p>
          <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span>{childName}</span>
            <span className="font-black" style={{ color: diffColor }}>· {quest.difficulty}</span>
            <span>· {quest.repetition}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${quest.status === 'active' ? 'bg-green-50 text-green-600' : quest.status === 'completed' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              {quest.status}
            </span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button type="button" onClick={onEdit} className="icon-button"><Edit2 className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onDelete} className="icon-button danger"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function RewardRow({ reward, childName, onApprove, onReject }: { reward: any; childName: string; onApprove: () => void; onReject: () => void }) {
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: '#64748b', bg: '#f1f5f9' },
    requested: { label: '⏳ Pending', color: '#d97706', bg: '#fffbeb' },
    approved: { label: '✅ Approved', color: '#16a34a', bg: '#f0fdf4' },
    rejected: { label: '❌ Rejected', color: '#dc2626', bg: '#fef2f2' },
  };
  const status = statusMap[reward.status] || statusMap.active;
  return (
    <div className="row-card">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
          🎁
        </div>
        <div className="min-w-0">
          <p className="font-black text-slate-800 text-sm truncate">{reward.title}</p>
          <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            {childName} · <span className="text-amber-500 font-black">🪙 {reward.coinsCost} coins</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ color: status.color, background: status.bg }}>
              {status.label}
            </span>
          </p>
        </div>
      </div>
      {reward.status === "requested" && (
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={onApprove} className="small-green">Approve</button>
          <button type="button" onClick={onReject} className="small-red">Reject</button>
        </div>
      )}
    </div>
  );
}

function ModalHeader({ title, emoji, onClose }: { title: string; emoji: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '2px solid #f1f5f9' }}>
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">{title}</h2>
      </div>
      <button type="button" onClick={onClose} className="icon-button"><X className="h-4 w-4" /></button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; min?: number }) {
  return (
    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
      {label}
      <input type={type} required={required} placeholder={placeholder} min={min} value={value} onChange={(e) => onChange(e.target.value)} className="field mt-2" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean }) {
  return (
    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
      {label}
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className="field mt-2">
        <option value="">Choose...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ModalShell({ children: modalChildren }: { children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border-2 border-b-4 border-[#E2E8F0] bg-white p-6 shadow-2xl max-h-[calc(100dvh-3rem)] overflow-y-auto animate-scale-in">
        {modalChildren}
      </div>
    </div>,
    document.body
  );
}
