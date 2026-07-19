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
    { key: "avatar_knight", name: "Noble Knight", icon: "???" },
    { key: "avatar_wizard", name: "Reading Wizard", icon: "??" },
    { key: "avatar_ninja", name: "Agile Ninja", icon: "??" },
    { key: "avatar_ranger", name: "Nature Ranger", icon: "??" },
    { key: "avatar_unicorn", name: "Magic Unicorn", icon: "??" },
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

  const getAvatarEmoji = (key: string) => avatars.find((avatar) => avatar.key === key)?.icon || "??";

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
      showMessage(childForm.isEdit ? "Hero updated." : "New hero created.");
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
      showMessage(questForm.isEdit ? "Quest updated." : "Quest assigned.");
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
      showMessage("Reward created.");
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
    showMessage("Quest verified. XP and coins awarded.");
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
    showMessage("Quest sent back.");
  };

  const approveReward = async (id: string) => {
    const res = await fetch(`/api/parent/rewards/${id}/approve`, { method: "POST", headers: authHeaders });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not approve reward.");
      return;
    }
    await fetchData();
    showMessage("Reward approved.");
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
    { id: "analytics" as Tab, label: "Progress & Stats", icon: BarChart2, count: children.length },
    { id: "children" as Tab, label: "Manage Heroes", icon: Users, count: children.length },
    { id: "quests" as Tab, label: "Quest Master", icon: Compass, count: quests.length },
    { id: "rewards" as Tab, label: "Rewards Shop", icon: Gift, count: rewards.length },
    { id: "verifications" as Tab, label: "Verifications", icon: Check, count: pendingQuests.length },
    { id: "ai-tools" as Tab, label: "AI Parenting Hub", icon: Sparkles, count: reports.length },
  ];

  const ModalShell = ({ children: modalChildren }: { children: React.ReactNode }) =>
    createPortal(
      <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-6 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border-2 border-b-4 border-[#E2E8F0] bg-white p-6 shadow-2xl max-h-[calc(100dvh-3rem)] overflow-y-auto">
          {modalChildren}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans text-[#1E293B] md:flex">
      {message && <div className="fixed right-4 top-4 z-[10000] rounded-2xl border-2 border-sky-200 bg-sky-50 px-5 py-3 text-xs font-black text-sky-700 shadow-lg">{message}</div>}

      <aside className="w-full border-r border-[#E2E8F0] bg-white md:min-h-screen md:w-72 sticky top-0 z-50 flex flex-col shadow-sm md:shadow-none">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-b-4 border-[#46A302] bg-[#58CC02] text-xl font-black text-white">H</div>
            <div>
              <h2 className="text-sm font-black uppercase text-[#4B4B4B]">HabitQuest</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Parent Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2"><button type="button" onClick={onLogout} className="md:hidden rounded-xl p-2 text-rose-500 hover:bg-rose-50" title="Sign Out"><LogOut className="h-5 w-5" /></button><button type="button" onClick={fetchData} className="rounded-xl p-2 text-[#777777] hover:bg-[#F1F5F9]" title="Refresh">
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="hidden md:block border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Family Map</p>
          <p className="text-sm font-black text-[#1899D6]">The {parent.name} Family</p>
        </div>

        <nav className="flex overflow-x-auto gap-2 p-4 md:flex-col md:space-y-2 md:gap-0 scrollbar-hide border-b md:border-b-0 border-[#E2E8F0]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-auto md:w-full shrink-0 whitespace-nowrap items-center justify-between rounded-2xl p-3 text-sm font-black transition ${
                  activeTab === item.id ? "bg-[#DDF4FF] text-[#1899D6]" : "text-[#777777] hover:bg-[#F1F5F9] hover:text-[#4B4B4B]"
                }`}
              >
                <span className="flex items-center gap-3"><Icon className="h-5 w-5 hidden md:block" />{item.label}</span>
                <span className="ml-2 rounded-full bg-[#E2E8F0] px-2.5 py-0.5 text-[10px] text-[#4B4B4B]">{item.count}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden md:block mt-auto border-t border-[#E2E8F0] p-4">
          <p className="mb-3 truncate text-xs font-black text-[#4B4B4B]">{parent.email}</p>
          <button type="button" onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 py-3 text-xs font-black uppercase text-rose-500">
            <LogOut className="h-4 w-4" /> Sign Out Family
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        {error && <div className="mb-5 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-600">{error}</div>}

        {activeTab === "analytics" && (
          <section className="space-y-6">
            <Header title="Progress & Stats" subtitle="Family habit progress at a glance" icon={<BarChart2 className="h-7 w-7" />} />
            <div className="grid gap-5 md:grid-cols-3">
              <Metric label="Children" value={children.length} />
              <Metric label="Active Quests" value={quests.length} />
              <Metric label="Rewards" value={rewards.length} />
            </div>
          </section>
        )}

        {activeTab === "children" && (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Header title="Manage Heroes" subtitle="Add children, customize profiles, and set their login ID and password" icon={<Users className="h-7 w-7" />} />
              <button type="button" onClick={() => setChildForm({ ...emptyChildForm, open: true })} className="primary-button"><Plus className="h-4 w-4" /> Add Hero Child</button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {children.map((child) => (
                <article key={child.id} className="rounded-3xl border-2 border-b-4 border-[#E2E8F0] bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-6xl">{getAvatarEmoji(child.avatar)}</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setChildForm({ open: true, isEdit: true, id: child.id, name: child.name, loginId: child.loginId || "", password: "", avatar: child.avatar })} className="icon-button"><Edit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => deleteChild(child.id)} className="icon-button danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <h3 className="mt-6 text-2xl font-black uppercase text-[#4B4B4B]">{child.name} <span className="rounded-full bg-sky-100 px-3 py-1 text-sm text-[#1899D6]">level {child.level}</span></h3>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black text-[#64748B]"><Flame className="h-5 w-5 text-[#FF4B4B]" /> Streak: <span className="text-[#FF4B4B]">{child.streak} days</span> <span>|</span> Login ID: <span className="font-mono text-[#334155]">{child.loginId}</span></p>
                  <div className="mt-5 flex items-center justify-between rounded-3xl border-2 border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div><p className="text-xs font-black uppercase text-[#1899D6]">Pet Buddy</p><p className="font-black text-[#4B4B4B]">{child.pet?.name || "Mochi the Bunny"}</p></div>
                    <span className="rounded-2xl bg-sky-100 px-4 py-2 font-black text-[#1899D6]">Lvl {child.pet?.level || 1}</span>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#E2E8F0] pt-5">
                    <button type="button" onClick={() => openQuestForChild(child.id)} className="secondary-button text-[#1899D6]">Assign Quest</button>
                    <button type="button" onClick={() => openRewardForChild(child.id)} className="secondary-button text-[#58CC02]">Create Reward</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "quests" && (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Header title="Quest Master Board" subtitle="Create and customize quest habits for daily streaks" icon={<Compass className="h-7 w-7" />} />
              <button type="button" onClick={() => setQuestForm({ ...emptyQuestForm, open: true, childId: children[0]?.id || "" })} className="primary-button"><Plus className="h-4 w-4" /> Craft A Quest</button>
            </div>
            <DataList empty="No quests yet.">
              {quests.map((quest) => <div key={quest.id}><QuestRow quest={quest} childName={childName(quest.childId)} onEdit={() => setQuestForm({ open: true, isEdit: true, id: quest.id, childId: quest.childId, title: quest.title, difficulty: quest.difficulty, repetition: quest.repetition, reminderTime: quest.reminderTime, requireProof: quest.requireProof })} onDelete={() => deleteQuest(quest.id)} /></div>)}
            </DataList>
          </section>
        )}

        {activeTab === "rewards" && (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Header title="Rewards Shop Board" subtitle="Create rewards children can claim with coins" icon={<Gift className="h-7 w-7" />} />
              <button type="button" onClick={() => setRewardForm({ ...emptyRewardForm, open: true, childId: children[0]?.id || "" })} className="primary-button"><Plus className="h-4 w-4" /> Stock Reward</button>
            </div>
            <DataList empty="No rewards yet.">
              {rewards.map((reward) => <div key={reward.id}><RewardRow reward={reward} childName={childName(reward.childId)} onApprove={() => approveReward(reward.id)} onReject={() => rejectReward(reward.id)} /></div>)}
            </DataList>
          </section>
        )}

        {activeTab === "verifications" && (
          <section className="space-y-6">
            <Header title="Quest Verification Queue" subtitle="Confirm completed quests and send feedback" icon={<Check className="h-7 w-7" />} />
            <DataList empty="All caught up.">
              {pendingQuests.map((quest) => (
                <div key={quest.id} className="row-card">
                  <div><p className="font-black text-[#4B4B4B]">{quest.adventureTitle}</p><p className="text-xs font-bold text-[#64748B]">{childName(quest.childId)} submitted: {quest.title}</p></div>
                  <div className="flex gap-2"><button type="button" onClick={() => verifyQuest(quest.id)} className="small-green">Verify</button><button type="button" onClick={() => setRejectQuestModal({ open: true, questId: quest.id, comment: "" })} className="small-red">Reject</button></div>
                </div>
              ))}
            </DataList>
          </section>
        )}

        {activeTab === "ai-tools" && (
          <section className="space-y-6">
            <Header title="AI Parenting Hub" subtitle="Generate plans, advice, and child reports" icon={<Sparkles className="h-7 w-7" />} />
            <div className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={handleAIPlanSubmit} className="panel space-y-4"><h3 className="panel-title">AI Habit Planner</h3><textarea value={plannerPrompt} onChange={(e) => setPlannerPrompt(e.target.value)} className="field h-28" /><button className="primary-button" type="submit">Generate Plan</button>{aiPlanResult && <pre className="result-box">{JSON.stringify(aiPlanResult, null, 2)}</pre>}</form>
              <form onSubmit={handleAIAssistantSubmit} className="panel space-y-4"><h3 className="panel-title">Parent Assistant</h3><textarea value={assistantQuestion} onChange={(e) => setAssistantQuestion(e.target.value)} className="field h-28" /><button className="primary-button" type="submit">Ask Assistant</button>{aiAdviceResult && <div className="result-box whitespace-pre-wrap">{aiAdviceResult}</div>}</form>
            </div>
            <form onSubmit={handleAIReportSubmit} className="panel space-y-4"><h3 className="panel-title">Weekly Report</h3><select required value={selectedChildForReport} onChange={(e) => setSelectedChildForReport(e.target.value)} className="field"><option value="">Choose child</option>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select><button className="primary-button" type="submit">Generate Report</button>{generatedReport && <pre className="result-box">{JSON.stringify(generatedReport, null, 2)}</pre>}</form>
          </section>
        )}
      </main>

      {childForm.open && <ModalShell><ModalHeader title={childForm.isEdit ? "Edit Hero Profile" : "Register New Child Hero"} onClose={() => setChildForm(emptyChildForm)} /><form onSubmit={handleChildSubmit} className="space-y-4"><Field label="Hero Name" value={childForm.name} onChange={(value) => setChildForm({ ...childForm, name: value })} required /><Field label="Child Login ID" value={childForm.loginId} onChange={(value) => setChildForm({ ...childForm, loginId: value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} required /><Field label="Child Password" type="password" value={childForm.password} onChange={(value) => setChildForm({ ...childForm, password: value })} required={!childForm.isEdit} placeholder={childForm.isEdit ? "Leave blank to keep current password" : "Password child will use"} /><SelectField label="Hero Avatar Class" value={childForm.avatar} onChange={(value) => setChildForm({ ...childForm, avatar: value })} options={avatars.map((avatar) => ({ value: avatar.key, label: `${avatar.name} ${avatar.icon}` }))} /><button disabled={saving} type="submit" className="primary-button w-full">{saving ? "Saving..." : childForm.isEdit ? "Save Hero" : "Create Hero"}</button></form></ModalShell>}

      {questForm.open && <ModalShell><ModalHeader title={questForm.isEdit ? "Edit Quest Details" : "Craft A Gamified Quest"} onClose={() => setQuestForm(emptyQuestForm)} /><form onSubmit={handleQuestSubmit} className="space-y-4"><SelectField label="Assign to Hero Child" value={questForm.childId} onChange={(value) => setQuestForm({ ...questForm, childId: value })} options={children.map((child) => ({ value: child.id, label: child.name }))} required /><Field label="Chore / Habit Name" value={questForm.title} onChange={(value) => setQuestForm({ ...questForm, title: value })} required placeholder="e.g. Brush Teeth" /><div className="grid grid-cols-2 gap-3"><SelectField label="Difficulty" value={questForm.difficulty} onChange={(value) => setQuestForm({ ...questForm, difficulty: value })} options={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} /><SelectField label="Frequency" value={questForm.repetition} onChange={(value) => setQuestForm({ ...questForm, repetition: value })} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} /></div><div className="grid grid-cols-2 gap-3"><Field label="Reminder Time" type="time" value={questForm.reminderTime} onChange={(value) => setQuestForm({ ...questForm, reminderTime: value })} /><SelectField label="Required Proof" value={questForm.requireProof} onChange={(value) => setQuestForm({ ...questForm, requireProof: value })} options={[{ value: "none", label: "None" }, { value: "text", label: "Text" }, { value: "photo", label: "Photo" }]} /></div><button disabled={saving} type="submit" className="primary-button w-full">{saving ? "Saving..." : questForm.isEdit ? "Update Quest" : "Assign Quest"}</button></form></ModalShell>}

      {rewardForm.open && <ModalShell><ModalHeader title="Stock A New Reward" onClose={() => setRewardForm(emptyRewardForm)} /><form onSubmit={handleRewardSubmit} className="space-y-4"><SelectField label="Assign to Hero Child" value={rewardForm.childId} onChange={(value) => setRewardForm({ ...rewardForm, childId: value })} options={children.map((child) => ({ value: child.id, label: child.name }))} required /><Field label="Reward Title" value={rewardForm.title} onChange={(value) => setRewardForm({ ...rewardForm, title: value })} required placeholder="e.g. 30 Minutes TV Time" /><Field label="Coin Value Cost" type="number" value={rewardForm.coinsCost} onChange={(value) => setRewardForm({ ...rewardForm, coinsCost: value })} required min={5} /><button disabled={saving} type="submit" className="primary-button w-full">{saving ? "Saving..." : "Create Reward"}</button></form></ModalShell>}

      {rejectQuestModal.open && <ModalShell><ModalHeader title="Send Quest Back" onClose={() => setRejectQuestModal({ open: false, questId: "", comment: "" })} /><form onSubmit={rejectQuest} className="space-y-4"><textarea required value={rejectQuestModal.comment} onChange={(e) => setRejectQuestModal({ ...rejectQuestModal, comment: e.target.value })} placeholder="Tell your child what to improve." className="field h-28" /><button type="submit" className="small-red w-full py-3">Submit Feedback</button></form></ModalShell>}
    </div>
  );
}

function Header({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return <div><h1 className="flex items-center gap-3 text-3xl font-black uppercase text-[#4B4B4B]">{icon}{title}</h1><p className="mt-2 text-sm font-bold text-[#64748B]">{subtitle}</p></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="panel"><p className="text-xs font-black uppercase text-[#64748B]">{label}</p><p className="mt-2 text-4xl font-black text-[#1899D6]">{value}</p></div>;
}

function DataList({ empty, children }: { empty: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0;
  return <div className="panel space-y-3">{hasChildren ? children : <p className="py-10 text-center text-sm font-black uppercase text-[#64748B]">{empty}</p>}</div>;
}

function QuestRow({ quest, childName, onEdit, onDelete }: { quest: any; childName: string; onEdit: () => void; onDelete: () => void }) {
  return <div className="row-card"><div><p className="font-black text-[#4B4B4B]">{quest.adventureTitle || quest.title}</p><p className="text-xs font-bold text-[#64748B]">{childName} � {quest.difficulty} � {quest.repetition} � {quest.status}</p></div><div className="flex gap-2"><button type="button" onClick={onEdit} className="icon-button"><Edit2 className="h-4 w-4" /></button><button type="button" onClick={onDelete} className="icon-button danger"><Trash2 className="h-4 w-4" /></button></div></div>;
}

function RewardRow({ reward, childName, onApprove, onReject }: { reward: any; childName: string; onApprove: () => void; onReject: () => void }) {
  return <div className="row-card"><div><p className="font-black text-[#4B4B4B]">{reward.title}</p><p className="text-xs font-bold text-[#64748B]">{childName} � {reward.coinsCost} coins � {reward.status}</p></div>{reward.status === "requested" && <div className="flex gap-2"><button type="button" onClick={onApprove} className="small-green">Approve</button><button type="button" onClick={onReject} className="small-red">Reject</button></div>}</div>;
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black uppercase text-[#4B4B4B]">{title}</h2><button type="button" onClick={onClose} className="icon-button"><X className="h-5 w-5" /></button></div>;
}

function Field({ label, value, onChange, type = "text", required, placeholder, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; min?: number }) {
  return <label className="block text-xs font-black uppercase text-[#64748B]">{label}<input type={type} required={required} placeholder={placeholder} min={min} value={value} onChange={(e) => onChange(e.target.value)} className="field mt-2" /></label>;
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean }) {
  return <label className="block text-xs font-black uppercase text-[#64748B]">{label}<select required={required} value={value} onChange={(e) => onChange(e.target.value)} className="field mt-2"><option value="">Choose...</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}



