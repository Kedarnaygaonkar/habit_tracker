import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Edit2, LogOut, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";

interface ParentDashboardProps {
  token: string;
  parent: { id: string; name: string; email: string };
  onLogout: () => void;
}

type Tab = "heroes" | "tasks" | "rewards" | "verify" | "settings";

const emptyChildForm = { open: false, isEdit: false, id: "", name: "", loginId: "", password: "", avatar: "avatar_knight" };
const emptyQuestForm = { open: false, isEdit: false, id: "", childId: "", title: "", difficulty: "medium", repetition: "daily", reminderTime: "08:00", requireProof: "none" };
const emptyRewardForm = { open: false, childId: "", title: "", coinsCost: "30" };

export default function ParentDashboard({ token, parent, onLogout }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("heroes");
  const [children, setChildren] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [childForm, setChildForm] = useState(emptyChildForm);
  const [questForm, setQuestForm] = useState(emptyQuestForm);
  const [rewardForm, setRewardForm] = useState(emptyRewardForm);
  const [rejectModal, setRejectModal] = useState({ open: false, questId: "", comment: "" });
  const [saving, setSaving] = useState(false);

  // AI Tools
  const [plannerPrompt, setPlannerPrompt] = useState("My child needs a better morning routine.");
  const [aiPlanResult, setAiPlanResult] = useState<any | null>(null);
  const [assistantQ, setAssistantQ] = useState("How do I encourage homework?");
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

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

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [cR, qR, rR] = await Promise.all([
        fetch("/api/parent/children", { headers: authHeaders }),
        fetch("/api/quests", { headers: authHeaders }),
        fetch("/api/rewards", { headers: authHeaders }),
      ]);
      if (!cR.ok || !qR.ok || !rR.ok) throw new Error("Failed to load data.");
      setChildren(await cR.json());
      setQuests(await qR.json());
      setRewards(await rR.json());
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ── CRUD handlers ──
  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const url = childForm.isEdit ? `/api/parent/children/${childForm.id}` : "/api/parent/children";
      const res = await fetch(url, { method: childForm.isEdit ? "PUT" : "POST", headers, body: JSON.stringify({ name: childForm.name, loginId: childForm.loginId, password: childForm.password, avatar: childForm.avatar }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChildForm(emptyChildForm); await fetchData(); showMsg(childForm.isEdit ? "Updated!" : "Hero created!");
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleQuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const url = questForm.isEdit ? `/api/parent/quests/${questForm.id}` : "/api/parent/quests";
      const res = await fetch(url, { method: questForm.isEdit ? "PUT" : "POST", headers, body: JSON.stringify({ childId: questForm.childId, title: questForm.title, difficulty: questForm.difficulty, repetition: questForm.repetition, reminderTime: questForm.reminderTime, requireProof: questForm.requireProof }) });
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

  const deleteChild = async (id: string) => { if (!confirm("Delete this child?")) return; const r = await fetch(`/api/parent/children/${id}`, { method: "DELETE", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Deleted."); } };
  const deleteQuest = async (id: string) => { if (!confirm("Delete this task?")) return; const r = await fetch(`/api/parent/quests/${id}`, { method: "DELETE", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Deleted."); } };
  const verifyQuest = async (id: string) => { const r = await fetch(`/api/parent/quests/${id}/verify`, { method: "POST", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Verified! ✅"); } else { const d = await r.json(); setError(d.error); } };
  const rejectQuest = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch(`/api/parent/quests/${rejectModal.questId}/reject`, { method: "POST", headers, body: JSON.stringify({ comment: rejectModal.comment }) }); if (r.ok) { setRejectModal({ open: false, questId: "", comment: "" }); await fetchData(); showMsg("Sent back."); } };
  const approveReward = async (id: string) => { const r = await fetch(`/api/parent/rewards/${id}/approve`, { method: "POST", headers: authHeaders }); if (r.ok) { await fetchData(); showMsg("Approved! 🎉"); } };
  const rejectReward = async (id: string) => { const r = await fetch(`/api/parent/rewards/${id}/reject`, { method: "POST", headers, body: JSON.stringify({ comment: "Not approved." }) }); if (r.ok) { await fetchData(); showMsg("Rejected."); } };

  const handleAIPlan = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch("/api/ai/plan", { method: "POST", headers, body: JSON.stringify({ description: plannerPrompt }) }); setAiPlanResult(await r.json()); };
  const handleAIAdvice = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch("/api/ai/assistant", { method: "POST", headers, body: JSON.stringify({ question: assistantQ }) }); const d = await r.json(); setAiAdvice(d.advice || "No advice."); };

  const pendingQuests = quests.filter(q => q.status === "completed");
  const requestedRewards = rewards.filter(r => r.status === "requested");

  const navItems = [
    { id: "heroes" as Tab, icon: "👨‍👩‍👧", label: "Heroes", alert: false },
    { id: "tasks" as Tab, icon: "📋", label: "Tasks", alert: false },
    { id: "rewards" as Tab, icon: "🎁", label: "Rewards", alert: requestedRewards.length > 0 },
    { id: "verify" as Tab, icon: "✅", label: "Verify", alert: pendingQuests.length > 0 },
    { id: "settings" as Tab, icon: "⚙️", label: "More", alert: false },
  ];

  return (
    <div className="app-bg min-h-screen pb-24 select-none">
      {/* Toast */}
      {message && <div className="toast flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> {message}</div>}

      {/* Header */}
      <header className="sticky top-0 z-40 header-bg backdrop-blur-md border-b-2 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl text-white shadow-md">🏰</div>
            <div>
              <h2 className="text-base font-black text-slate-800 leading-tight">HabitQuest</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parent Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => document.documentElement.classList.toggle('dark')} className="theme-toggle mr-2" aria-label="Toggle Dark Mode"></button>
            <button onClick={fetchData} className="p-2 rounded-xl bg-slate-100 text-slate-500 active:bg-slate-200">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        {error && <div className="mb-4 p-3 rounded-xl text-sm font-bold bg-red-50 border-2 border-red-200 text-red-600 flex items-center gap-2">⚠️ {error}</div>}

        {/* ── HEROES ── */}
        {activeTab === "heroes" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">👨‍👩‍👧 My Heroes</h3>
              <button onClick={() => setChildForm({ ...emptyChildForm, open: true })} className="btn btn-blue py-2 px-4 text-sm">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {children.length === 0 ? (
              <div className="card text-center py-12"><p className="text-5xl mb-3">👨‍👩‍👧</p><p className="text-lg font-black text-slate-700">No children yet!</p></div>
            ) : (
              <div className="space-y-3">
                {children.map(c => (
                  <div key={c.id} className="card flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-3xl shadow-sm shrink-0">
                      <span className="sticker bg-white/50">{getEmoji(c.avatar)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-lg text-slate-800">{c.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="pill pill-purple text-xs">Lvl {c.level}</span>
                        <span className="pill pill-gold text-xs">⭐ {c.xp || 0}</span>
                        <span className="pill pill-red text-xs">🔥 {c.streak || 0}d</span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-1">ID: {c.loginId}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => setChildForm({ open: true, isEdit: true, id: c.id, name: c.name, loginId: c.loginId || "", password: "", avatar: c.avatar })} className="p-2 rounded-lg bg-slate-100 text-slate-500 active:bg-slate-200">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteChild(c.id)} className="p-2 rounded-lg bg-red-50 text-red-500 active:bg-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TASKS ── */}
        {activeTab === "tasks" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">📋 All Tasks</h3>
              <button onClick={() => setQuestForm({ ...emptyQuestForm, open: true, childId: children[0]?.id || "" })} className="btn btn-green py-2 px-4 text-sm">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {quests.length === 0 ? (
              <div className="card text-center py-12"><p className="text-5xl mb-3">📋</p><p className="text-lg font-black text-slate-700">No tasks yet!</p></div>
            ) : (
              <div className="space-y-3">
                {quests.map(q => {
                  const dc = q.difficulty === "easy" ? "border-l-green-400" : q.difficulty === "medium" ? "border-l-amber-400" : "border-l-red-400";
                  return (
                    <div key={q.id} className={`card flex items-center justify-between border-l-4 ${dc}`}>
                      <div>
                        <p className="font-black text-base text-slate-800">{q.title}</p>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">{childName(q.childId)} · {q.difficulty} · +{q.xp}XP</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setQuestForm({ open: true, isEdit: true, id: q.id, childId: q.childId, title: q.title, difficulty: q.difficulty, repetition: q.repetition, reminderTime: q.reminderTime, requireProof: q.requireProof })} className="p-2 rounded-lg bg-slate-100 text-slate-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteQuest(q.id)} className="p-2 rounded-lg bg-red-50 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── REWARDS ── */}
        {activeTab === "rewards" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">🎁 Rewards</h3>
              <button onClick={() => setRewardForm({ ...emptyRewardForm, open: true, childId: children[0]?.id || "" })} className="btn btn-yellow py-2 px-4 text-sm">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {rewards.length === 0 ? (
              <div className="card text-center py-12"><p className="text-5xl mb-3">🎁</p><p className="text-lg font-black text-slate-700">No rewards yet!</p></div>
            ) : (
              <div className="space-y-3">
                {rewards.map(r => (
                  <div key={r.id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-black text-base text-slate-800">{r.title}</p>
                      <p className="text-xs font-bold text-slate-400">{childName(r.childId)} · {r.coinsCost} 🪙</p>
                    </div>
                    {r.status === "requested" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => approveReward(r.id)} className="btn btn-green py-1.5 px-3 text-xs">✅</button>
                        <button onClick={() => rejectReward(r.id)} className="btn btn-red py-1.5 px-3 text-xs">❌</button>
                      </div>
                    )}
                    {r.status === "approved" && <span className="pill pill-green">Approved</span>}
                    {r.status === "available" && <span className="pill pill-blue">Active</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VERIFY ── */}
        {activeTab === "verify" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-black text-slate-800">✅ Verify Tasks</h3>

            {pendingQuests.length === 0 ? (
              <div className="card text-center py-12"><p className="text-5xl mb-3">🎉</p><p className="text-lg font-black text-slate-700">All caught up!</p><p className="text-sm font-bold text-slate-400 mt-1">No tasks waiting for approval</p></div>
            ) : (
              <div className="space-y-3">
                {pendingQuests.map(q => (
                  <div key={q.id} className="card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">📸</div>
                      <div className="flex-1">
                        <p className="font-black text-base text-slate-800">{q.title}</p>
                        <p className="text-xs font-bold text-slate-400">{childName(q.childId)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => verifyQuest(q.id)} className="btn btn-green flex-1 py-2.5 text-sm">Approve</button>
                      <button onClick={() => setRejectModal({ open: true, questId: q.id, comment: "" })} className="btn btn-red flex-1 py-2.5 text-sm">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-xl font-black text-slate-800">⚙️ Settings & AI Tools</h3>

            {/* Family Info */}
            <div className="card p-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Family</p>
              <p className="text-lg font-black text-slate-800">The {parent.name} Family</p>
              <p className="text-sm font-bold text-slate-400">{parent.email}</p>
            </div>

            {/* AI Planner */}
            <form onSubmit={handleAIPlan} className="card p-5 space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">🤖 AI Habit Planner</h4>
              <textarea value={plannerPrompt} onChange={(e) => setPlannerPrompt(e.target.value)} className="input h-24 resize-none text-sm" />
              <button className="btn btn-purple w-full py-3 text-sm" type="submit"><Sparkles className="w-4 h-4" /> Generate Plan</button>
              {aiPlanResult && <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto">{JSON.stringify(aiPlanResult, null, 2)}</div>}
            </form>

            {/* AI Assistant */}
            <form onSubmit={handleAIAdvice} className="card p-5 space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">💬 Parent Assistant</h4>
              <textarea value={assistantQ} onChange={(e) => setAssistantQ(e.target.value)} className="input h-24 resize-none text-sm" />
              <button className="btn btn-blue w-full py-3 text-sm" type="submit"><Sparkles className="w-4 h-4" /> Ask</button>
              {aiAdvice && <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto">{aiAdvice}</div>}
            </form>

            {/* Logout */}
            <button onClick={onLogout} className="btn btn-outline w-full text-red-500 border-red-200">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-item ${activeTab === item.id ? "active" : ""}`}>
            <span className="nav-icon relative">
              {item.icon}
              {item.alert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── MODALS ── */}
      {childForm.open && (
        <Modal title={childForm.isEdit ? "Edit Hero" : "Add Hero"} emoji="🛡️" onClose={() => setChildForm(emptyChildForm)}>
          <form onSubmit={handleChildSubmit} className="space-y-4">
            <FormField label="Name" value={childForm.name} onChange={v => setChildForm({ ...childForm, name: v })} placeholder="e.g. Leo" required />
            <FormField label="Login ID" value={childForm.loginId} onChange={v => setChildForm({ ...childForm, loginId: v.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} placeholder="e.g. leo" required />
            <FormField label="Password" type="password" value={childForm.password} onChange={v => setChildForm({ ...childForm, password: v })} placeholder="Secret password" required={!childForm.isEdit} />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Difficulty</label>
                <select value={questForm.difficulty} onChange={e => setQuestForm({ ...questForm, difficulty: e.target.value })} className="select">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Proof</label>
                <select value={questForm.requireProof} onChange={e => setQuestForm({ ...questForm, requireProof: e.target.value })} className="select">
                  <option value="none">None</option>
                  <option value="photo">Photo</option>
                  <option value="text">Text</option>
                </select>
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

      {rejectModal.open && (
        <Modal title="Reject Task" emoji="⚠️" onClose={() => setRejectModal({ open: false, questId: "", comment: "" })}>
          <form onSubmit={rejectQuest} className="space-y-4">
            <p className="text-sm font-bold text-slate-500">Give feedback so they can try again.</p>
            <textarea required value={rejectModal.comment} onChange={e => setRejectModal({ ...rejectModal, comment: e.target.value })} className="input h-24 resize-none" placeholder="E.g. Please also clean under the bed!" />
            <button type="submit" className="btn btn-red w-full py-4">Send Feedback</button>
          </form>
        </Modal>
      )}
    </div>
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
  <div className="modal-overlay animate-fade-in">
    <div className="modal-card relative">
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:bg-slate-200">
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
