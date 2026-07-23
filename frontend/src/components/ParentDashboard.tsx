import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award, BarChart2, Check, Compass, Edit2, Flame, Gift, LogOut,
  Plus, RefreshCw, Sparkles, Trash2, Users, X, TrendingUp, Star, Zap, ShieldCheck
} from "lucide-react";

interface ParentDashboardProps {
  token: string;
  parent: { id: string; name: string; email: string };
  onLogout: () => void;
}

type Tab = "analytics" | "children" | "quests" | "rewards" | "verifications" | "ai-tools";

const emptyChildForm = { open: false, isEdit: false, id: "", name: "", loginId: "", password: "", avatar: "avatar_knight" };
const emptyQuestForm = { open: false, isEdit: false, id: "", childId: "", title: "", difficulty: "medium", repetition: "daily", reminderTime: "08:00", requireProof: "none" };
const emptyRewardForm = { open: false, childId: "", title: "", coinsCost: "30" };

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

  // THEME STATE
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("habitquest_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    localStorage.setItem("habitquest_theme", theme);
  }, [theme]);

  const avatars = [
    { key: "avatar_knight", name: "Noble Knight", icon: "🛡️" },
    { key: "avatar_wizard", name: "Reading Wizard", icon: "🔮" },
    { key: "avatar_ninja", name: "Agile Ninja", icon: "🥷" },
    { key: "avatar_ranger", name: "Nature Ranger", icon: "🏹" },
    { key: "avatar_unicorn", name: "Magic Unicorn", icon: "🦄" },
  ];

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
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
        body: JSON.stringify({ childId: rewardForm.childId, title: rewardForm.title, coinsCost: rewardForm.coinsCost }),
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
    { id: "analytics" as Tab, label: "Stats", icon: BarChart2, emoji: "📊", count: children.length, alert: false },
    { id: "children" as Tab, label: "Heroes", icon: Users, emoji: "👨‍👩‍👧", count: children.length, alert: false },
    { id: "quests" as Tab, label: "Quests", icon: Compass, emoji: "⚔️", count: quests.length, alert: false },
    { id: "rewards" as Tab, label: "Rewards", icon: Gift, emoji: "🎁", count: rewards.length, alert: requestedRewards.length > 0 },
    { id: "verifications" as Tab, label: "Verify", icon: Check, emoji: "✅", count: pendingQuests.length, alert: pendingQuests.length > 0 },
    { id: "ai-tools" as Tab, label: "AI Hub", icon: Sparkles, emoji: "🤖", count: reports.length, alert: false },
  ];

  return (
    <div className={`min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans theme-${theme} md:flex pb-24 md:pb-0`}>
      {/* ── TOAST ── */}
      {message && (
        <div className="fixed right-4 top-4 z-[10000] toast-success flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          {message}
        </div>
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="parent-sidebar hidden md:flex w-72 min-h-screen sticky top-0 z-50 flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
              🏰
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-[var(--text-main)]">HabitQuest</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Parent Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchData} className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--border-color)] transition cursor-pointer" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--border-color)] transition cursor-pointer"
              title="Toggle Theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-[var(--border-color)]">
          <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-[var(--text-muted)]">Family</p>
          <p className="text-sm font-black text-purple-500">The {parent.name} Family</p>
        </div>

        <nav className="flex flex-col p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between p-3 rounded-xl font-bold transition-all ${
                activeTab === item.id 
                  ? "bg-purple-100 text-purple-700 border-2 border-purple-200 shadow-sm" 
                  : "text-[var(--text-muted)] hover:bg-[var(--border-color)] border-2 border-transparent"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">{item.emoji}</span>
                {item.label}
              </span>
              {item.alert && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-[var(--border-color)]">
          <p className="mb-3 truncate text-xs font-bold text-[var(--text-muted)] text-center">{parent.email}</p>
          <button
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wide cursor-pointer transition text-red-500 bg-red-50 hover:bg-red-100 border-2 border-red-200"
          >
            <LogOut className="h-4 w-4" /> Sign Out Family
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER ── */}
      <header className="md:hidden sticky top-0 z-40 parent-sidebar flex items-center justify-between p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md">
            🏰
          </div>
          <h2 className="text-lg font-black uppercase tracking-wide text-[var(--text-main)]">Parent Portal</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")} className="p-2 rounded-xl text-[var(--text-muted)] bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-lg">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button onClick={onLogout} className="p-2 rounded-xl text-red-500 bg-red-100 border-2 border-red-200">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 parent-sidebar z-50 flex items-center justify-between px-2 py-3 shadow-t-xl">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all flex-1 relative ${
              activeTab === item.id ? "text-purple-600 bg-purple-100 border-2 border-purple-200" : "text-[var(--text-muted)] border-2 border-transparent"
            }`}
          >
            <span className="text-2xl mb-1">{item.emoji}</span>
            <span className="text-[10px] font-black uppercase">{item.label}</span>
            {item.alert && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm border border-white" />}
          </button>
        ))}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {error && (
          <div className="mb-5 rounded-2xl p-4 text-sm font-bold flex items-center gap-2 bg-red-100 border-2 border-red-300 text-red-600 shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && (
          <section className="space-y-6 animate-fade-in">
            <SectionHeader title="Progress & Stats" subtitle="Family habit progress at a glance" emoji="📊" />
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard label="Children" value={children.length} color="#6C3DE0" emoji="👨‍👩‍👧" />
              <MetricCard label="Active Quests" value={quests.length} color="#0ea5e9" emoji="⚔️" />
              <MetricCard label="Rewards" value={rewards.length} color="#f59e0b" emoji="🎁" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl p-6 shadow-[var(--card-shadow)]">
                <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-[var(--text-main)] uppercase tracking-wide">
                  <TrendingUp className="w-5 h-5 text-violet-500" /> Family Overview
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Pending Verifications", value: pendingQuests.length, color: pendingQuests.length > 0 ? '#f59e0b' : '#22c55e', icon: '⏳' },
                    { label: "Reward Requests", value: requestedRewards.length, color: requestedRewards.length > 0 ? '#f59e0b' : '#22c55e', icon: '🎁' },
                    { label: "Total Heroes", value: children.length, color: '#6C3DE0', icon: '🛡️' },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} className="flex items-center justify-between py-3 px-4 rounded-2xl bg-[var(--input-bg)] border-2 border-[var(--input-border)]">
                      <span className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                        <span className="text-xl">{icon}</span> {label}
                      </span>
                      <span className="text-xl font-black" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl p-6 shadow-[var(--card-shadow)]">
                <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-[var(--text-main)] uppercase tracking-wide">
                  <Star className="w-5 h-5 text-amber-500" /> Hero Leaderboard
                </h3>
                {children.length === 0 ? (
                  <p className="text-center text-sm font-bold text-[var(--text-muted)] py-8">No heroes yet.</p>
                ) : (
                  <div className="space-y-3">
                    {[...children].sort((a, b) => (b.xp || 0) - (a.xp || 0)).map((child, idx) => (
                      <div key={child.id} className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-[var(--input-bg)] border-2 border-[var(--input-border)]">
                        <span className="text-2xl w-8 text-center" style={{ color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#b45309' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="text-3xl">{getAvatarEmoji(child.avatar)}</span>
                        <div className="flex-1">
                          <p className="text-sm font-black text-[var(--text-main)]">{child.name}</p>
                          <p className="text-xs font-bold text-[var(--text-muted)]">Lvl {child.level} · {child.streak || 0}d streak</p>
                        </div>
                        <span className="text-sm font-black px-3 py-1 rounded-xl text-purple-600 bg-purple-100 border-2 border-purple-200">
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
              <SectionHeader title="Manage Heroes" subtitle="Add children and customize profiles" emoji="👨‍👩‍👧" />
              <button type="button" onClick={() => setChildForm({ ...emptyChildForm, open: true })} className="primary-button w-full sm:w-auto">
                <Plus className="h-5 w-5" /> Add Hero Child
              </button>
            </div>

            {children.length === 0 ? (
              <div className="bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-3xl text-center py-16 shadow-[var(--card-shadow)]">
                <div className="text-6xl mb-4">👨‍👩‍👧</div>
                <p className="text-lg font-black uppercase text-[var(--text-main)]">No heroes yet!</p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {children.map((child) => (
                  <article key={child.id} className="bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-[2.5rem] overflow-hidden shadow-lg relative">
                    <div className="h-24 bg-gradient-to-r from-purple-500 to-indigo-500 flex items-start justify-end p-4">
                      <div className="flex gap-2 bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/30">
                        <button type="button" onClick={() => setChildForm({ open: true, isEdit: true, id: child.id, name: child.name, loginId: child.loginId || "", password: "", avatar: child.avatar })} className="p-1.5 text-white hover:text-purple-200">
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button type="button" onClick={() => deleteChild(child.id)} className="p-1.5 text-white hover:text-red-300">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="px-6 pb-6 pt-12 relative text-center sm:text-left sm:pt-6">
                      <div className="w-24 h-24 rounded-3xl bg-white border-4 border-indigo-200 shadow-xl flex items-center justify-center text-5xl absolute -top-12 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0">
                        {getAvatarEmoji(child.avatar)}
                      </div>

                      <div className="sm:ml-32 sm:flex sm:items-start sm:justify-between mb-4 mt-12 sm:mt-0">
                        <div>
                          <h3 className="text-2xl font-black text-[var(--text-main)]">{child.name}</h3>
                          <p className="text-sm font-bold text-[var(--text-muted)] mb-2">Login: {child.loginId}</p>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <span className="text-xs font-black px-3 py-1 rounded-xl bg-purple-100 text-purple-700 border-2 border-purple-200">
                              Level {child.level}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-black bg-red-100 text-red-600 px-3 py-1 rounded-xl border-2 border-red-200">
                              <Flame className="h-3.5 w-3.5" /> {child.streak || 0}d
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl p-4 mt-6 bg-[var(--input-bg)] border-2 border-[var(--input-border)]">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">🐾</span>
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-wider text-purple-500">Pet Buddy</p>
                            <p className="text-base font-black text-[var(--text-main)]">{child.pet?.name || "Mochi"}</p>
                          </div>
                        </div>
                        <span className="rounded-xl px-4 py-2 text-sm font-black bg-purple-100 text-purple-700 border-2 border-purple-200">
                          Lvl {child.pet?.level || 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button type="button" onClick={() => openQuestForChild(child.id)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase bg-sky-100 text-sky-700 border-b-4 border-sky-300 active:translate-y-1 active:border-b-0">
                          <Compass className="h-4 w-4" /> Quest
                        </button>
                        <button type="button" onClick={() => openRewardForChild(child.id)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase bg-green-100 text-green-700 border-b-4 border-green-300 active:translate-y-1 active:border-b-0">
                          <Gift className="h-4 w-4" /> Reward
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
              <SectionHeader title="Quest Master Board" subtitle="Manage habits and chores" emoji="⚔️" />
              <button type="button" onClick={() => setQuestForm({ ...emptyQuestForm, open: true, childId: children[0]?.id || "" })} className="primary-button w-full sm:w-auto">
                <Plus className="h-5 w-5" /> Craft Quest
              </button>
            </div>
            <div className="space-y-4">
              {quests.length === 0 ? (
                <p className="py-12 text-center text-lg font-black uppercase text-[var(--text-muted)]">No quests yet.</p>
              ) : (
                quests.map((quest) => (
                  <QuestRow key={quest.id} quest={quest} childName={childName(quest.childId)} onEdit={() => setQuestForm({ open: true, isEdit: true, ...quest })} onDelete={() => deleteQuest(quest.id)} />
                ))
              )}
            </div>
          </section>
        )}

        {/* ── REWARDS ── */}
        {activeTab === "rewards" && (
          <section className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader title="Rewards Shop" subtitle="Prizes for hard work" emoji="🎁" />
              <button type="button" onClick={() => setRewardForm({ ...emptyRewardForm, open: true, childId: children[0]?.id || "" })} className="primary-button w-full sm:w-auto">
                <Plus className="h-5 w-5" /> Stock Reward
              </button>
            </div>
            <div className="space-y-4">
              {rewards.length === 0 ? (
                <p className="py-12 text-center text-lg font-black uppercase text-[var(--text-muted)]">No rewards yet.</p>
              ) : (
                rewards.map((reward) => (
                  <RewardRow key={reward.id} reward={reward} childName={childName(reward.childId)} onApprove={() => approveReward(reward.id)} onReject={() => rejectReward(reward.id)} />
                ))
              )}
            </div>
          </section>
        )}

        {/* ── VERIFICATIONS ── */}
        {activeTab === "verifications" && (
          <section className="space-y-6 animate-fade-in">
            <SectionHeader title="Verification Queue" subtitle="Approve completed quests" emoji="✅" />
            <div className="space-y-4">
              {pendingQuests.length === 0 ? (
                <div className="py-16 text-center bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-[2.5rem] shadow-[var(--card-shadow)]">
                  <div className="text-6xl mb-3">🎉</div>
                  <p className="text-lg font-black uppercase text-[var(--text-main)]">All caught up!</p>
                </div>
              ) : (
                pendingQuests.map((quest) => (
                  <div key={quest.id} className="bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-4xl shrink-0">📸</div>
                    <div className="flex-1">
                      <p className="font-black text-xl text-[var(--text-main)]">{quest.adventureTitle || quest.title}</p>
                      <p className="text-sm font-bold text-[var(--text-muted)] mt-1">
                        Hero: {childName(quest.childId)}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0">
                      <button onClick={() => verifyQuest(quest.id)} className="flex-1 sm:flex-none py-3 px-5 rounded-xl font-black text-sm uppercase bg-green-500 hover:bg-green-600 text-white border-b-4 border-green-700 active:translate-y-1 active:border-b-0">
                        Approve
                      </button>
                      <button onClick={() => setRejectQuestModal({ open: true, questId: quest.id, comment: "" })} className="flex-1 sm:flex-none py-3 px-5 rounded-xl font-black text-sm uppercase bg-red-500 hover:bg-red-600 text-white border-b-4 border-red-700 active:translate-y-1 active:border-b-0">
                        Reject
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
            <SectionHeader title="AI Parenting Hub" subtitle="Plans, advice, and reports" emoji="🤖" />

            <div className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={handleAIPlanSubmit} className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl p-6 shadow-[var(--card-shadow)] space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">Zap</div>
                  <h3 className="text-xl font-black uppercase tracking-wide text-[var(--text-main)]">Habit Planner</h3>
                </div>
                <textarea value={plannerPrompt} onChange={(e) => setPlannerPrompt(e.target.value)} className="w-full p-4 rounded-xl text-sm font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] outline-none focus:border-purple-500 min-h-[100px]" />
                <button className="primary-button w-full" type="submit"><Sparkles className="w-5 h-5 mr-2" /> Generate Plan</button>
                {aiPlanResult && (
                  <div className="result-box bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] mt-4 whitespace-pre-wrap">{JSON.stringify(aiPlanResult, null, 2)}</div>
                )}
              </form>

              <form onSubmit={handleAIAssistantSubmit} className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl p-6 shadow-[var(--card-shadow)] space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">Award</div>
                  <h3 className="text-xl font-black uppercase tracking-wide text-[var(--text-main)]">Parent Assistant</h3>
                </div>
                <textarea value={assistantQuestion} onChange={(e) => setAssistantQuestion(e.target.value)} className="w-full p-4 rounded-xl text-sm font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] outline-none focus:border-purple-500 min-h-[100px]" />
                <button className="primary-button w-full" type="submit"><Sparkles className="w-5 h-5 mr-2" /> Ask Assistant</button>
                {aiAdviceResult && (
                  <div className="result-box bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] mt-4 whitespace-pre-wrap">{aiAdviceResult}</div>
                )}
              </form>
            </div>
          </section>
        )}
      </main>

      {/* ── MODALS ── */}
      {/* Simplify Modals using Portal */}
      {childForm.open && (
        <ModalShell onClose={() => setChildForm(emptyChildForm)} title={childForm.isEdit ? "Edit Hero" : "New Hero"} emoji="🛡️">
          <form onSubmit={handleChildSubmit} className="space-y-4">
            <Field label="Hero Name" value={childForm.name} onChange={(v) => setChildForm({ ...childForm, name: v })} required placeholder="e.g. Leo" />
            <Field label="Login ID" value={childForm.loginId} onChange={(v) => setChildForm({ ...childForm, loginId: v.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} required placeholder="e.g. leo" />
            <Field label="Password" type="password" value={childForm.password} onChange={(v) => setChildForm({ ...childForm, password: v })} required={!childForm.isEdit} placeholder="Secret password" />
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-main)]">Avatar</label>
              <select value={childForm.avatar} onChange={(e) => setChildForm({ ...childForm, avatar: e.target.value })} className="w-full px-4 py-4 rounded-2xl text-lg font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] outline-none focus:border-purple-400">
                {avatars.map((avatar) => <option key={avatar.key} value={avatar.key}>{avatar.icon} {avatar.name}</option>)}
              </select>
            </div>
            <button disabled={saving} type="submit" className="primary-button w-full mt-4 py-5 text-xl">
              {saving ? "Saving..." : "Save Hero"}
            </button>
          </form>
        </ModalShell>
      )}

      {questForm.open && (
        <ModalShell onClose={() => setQuestForm(emptyQuestForm)} title={questForm.isEdit ? "Edit Quest" : "New Quest"} emoji="⚔️">
          <form onSubmit={handleQuestSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-main)]">Hero</label>
              <select value={questForm.childId} onChange={(e) => setQuestForm({ ...questForm, childId: e.target.value })} required className="w-full px-4 py-4 rounded-2xl text-lg font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] outline-none focus:border-purple-400">
                <option value="">Select a Hero...</option>
                {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
              </select>
            </div>
            <Field label="Quest Name" value={questForm.title} onChange={(v) => setQuestForm({ ...questForm, title: v })} required placeholder="Brush Teeth" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-main)]">Difficulty</label>
                <select value={questForm.difficulty} onChange={(e) => setQuestForm({ ...questForm, difficulty: e.target.value })} className="w-full px-4 py-4 rounded-2xl text-lg font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] outline-none">
                  <option value="easy">Easy (10 XP, 5 🪙)</option>
                  <option value="medium">Medium (25 XP, 15 🪙)</option>
                  <option value="hard">Hard (50 XP, 30 🪙)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-main)]">Proof</label>
                <select value={questForm.requireProof} onChange={(e) => setQuestForm({ ...questForm, requireProof: e.target.value })} className="w-full px-4 py-4 rounded-2xl text-lg font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] outline-none">
                  <option value="none">None (Trust)</option>
                  <option value="photo">Photo 📸</option>
                  <option value="text">Text ✍️</option>
                </select>
              </div>
            </div>
            <button disabled={saving} type="submit" className="primary-button w-full mt-4 py-5 text-xl">
              {saving ? "Saving..." : "Save Quest"}
            </button>
          </form>
        </ModalShell>
      )}

      {rewardForm.open && (
        <ModalShell onClose={() => setRewardForm(emptyRewardForm)} title="New Reward" emoji="🎁">
          <form onSubmit={handleRewardSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-main)]">Hero</label>
              <select value={rewardForm.childId} onChange={(e) => setRewardForm({ ...rewardForm, childId: e.target.value })} required className="w-full px-4 py-4 rounded-2xl text-lg font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] outline-none focus:border-purple-400">
                <option value="">Select a Hero...</option>
                {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
              </select>
            </div>
            <Field label="Reward Title" value={rewardForm.title} onChange={(v) => setRewardForm({ ...rewardForm, title: v })} required placeholder="e.g. 1 Hour Video Games" />
            <Field label="Coin Cost 🪙" type="number" value={rewardForm.coinsCost} onChange={(v) => setRewardForm({ ...rewardForm, coinsCost: v })} required placeholder="30" />
            <button disabled={saving} type="submit" className="primary-button w-full mt-4 py-5 text-xl">
              {saving ? "Saving..." : "Stock Reward"}
            </button>
          </form>
        </ModalShell>
      )}

      {rejectQuestModal.open && (
        <ModalShell onClose={() => setRejectQuestModal({ open: false, questId: "", comment: "" })} title="Reject Quest" emoji="⚠️">
          <form onSubmit={rejectQuest} className="space-y-4">
            <p className="text-sm font-bold text-[var(--text-muted)]">Give your hero some feedback so they can try again!</p>
            <textarea
              required
              value={rejectQuestModal.comment}
              onChange={(e) => setRejectQuestModal({ ...rejectQuestModal, comment: e.target.value })}
              className="w-full p-4 rounded-2xl text-base font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] h-32 outline-none focus:border-red-400"
              placeholder="E.g., Please make sure you clean under the bed too!"
            />
            <button type="submit" className="w-full py-4 rounded-xl font-black text-sm uppercase bg-red-500 hover:bg-red-600 text-white border-b-4 border-red-700 active:translate-y-1 active:border-b-0">
              Send Feedback
            </button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

// ── HELPERS ──
const SectionHeader = ({ title, subtitle, emoji }: { title: string; subtitle: string; emoji: string }) => (
  <div>
    <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 text-[var(--text-main)] uppercase">
      <span className="text-3xl md:text-4xl">{emoji}</span> {title}
    </h2>
    <p className="text-sm font-bold text-[var(--text-muted)] mt-1 ml-12">{subtitle}</p>
  </div>
);

const MetricCard = ({ label, value, color, emoji }: { label: string; value: number | string; color: string; emoji: string; bg?: string }) => (
  <div className="bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-3xl p-5 shadow-[var(--card-shadow)] flex items-center gap-4">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-[var(--input-bg)] border-2 border-[var(--input-border)]">
      {emoji}
    </div>
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
    </div>
  </div>
);

const Field = ({ label, type = "text", value, onChange, required, placeholder }: any) => (
  <div className="space-y-2">
    <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-main)]">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="w-full px-5 py-4 rounded-2xl text-lg font-bold bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-main)] outline-none focus:border-purple-400" />
  </div>
);

const QuestRow = ({ quest, childName, onEdit, onDelete }: any) => (
  <div className="bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-2 ${quest.difficulty === 'easy' ? 'bg-green-100 border-green-300' : quest.difficulty === 'medium' ? 'bg-amber-100 border-amber-300' : 'bg-red-100 border-red-300'}`}>
        ⚔️
      </div>
      <div>
        <h4 className="font-black text-xl text-[var(--text-main)]">{quest.title}</h4>
        <p className="text-sm font-bold text-[var(--text-muted)]">Hero: {childName}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <button onClick={onEdit} className="p-3 bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-xl text-[var(--text-muted)] hover:bg-purple-100 hover:text-purple-600 transition">
        <Edit2 className="w-5 h-5" />
      </button>
      <button onClick={onDelete} className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-500 hover:bg-red-100 transition">
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  </div>
);

const RewardRow = ({ reward, childName, onApprove, onReject }: any) => (
  <div className="bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <div className="text-4xl">🎁</div>
      <div>
        <h4 className="font-black text-xl text-[var(--text-main)]">{reward.title}</h4>
        <p className="text-sm font-bold text-[var(--text-muted)]">Hero: {childName} · Cost: {reward.coinsCost} 🪙</p>
      </div>
    </div>
    {reward.status === "requested" && (
      <div className="flex gap-2 w-full sm:w-auto">
        <button onClick={onApprove} className="flex-1 sm:flex-none py-3 px-5 rounded-xl font-black text-sm uppercase bg-green-500 hover:bg-green-600 text-white border-b-4 border-green-700 active:translate-y-1 active:border-b-0">Approve</button>
        <button onClick={onReject} className="flex-1 sm:flex-none py-3 px-5 rounded-xl font-black text-sm uppercase bg-red-500 hover:bg-red-600 text-white border-b-4 border-red-700 active:translate-y-1 active:border-b-0">Reject</button>
      </div>
    )}
  </div>
);

// Minimal Modal Wrapper
const ModalShell = ({ title, emoji, children, onClose }: any) => createPortal(
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="bg-[var(--bg-card)] border-4 border-[var(--border-color)] rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-muted)] hover:text-red-500">
        <X className="w-5 h-5" />
      </button>
      <div className="text-6xl mb-4 text-center">{emoji}</div>
      <h3 className="text-2xl font-black text-center uppercase tracking-wide text-[var(--text-main)] mb-6">{title}</h3>
      {children}
    </div>
  </div>,
  document.body
);
