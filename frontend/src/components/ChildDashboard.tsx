import React, { useState, useEffect } from "react";
import { 
  Award, Flame, Trophy, Coins, Compass, Sparkles, CheckCircle, 
  Clock, X, Send, Camera, Shield, Heart, HelpCircle, LogOut, Bell
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
        // Check if level has increased compared to local state to trigger levelUp confetti
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
    // Poll for notifications or parent approvals
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

  // Submit Quest Proof
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

  // Feed Pet
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
        // Happy bounce animation trigger
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

  // Buy Reward from store
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

  // Read notification
  const markNotifRead = async (notifId: string) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      fetchNotifs();
    } catch (e) {}
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center text-[#64748B]">
        <Sparkles className="w-12 h-12 text-[#1899D6] animate-spin mb-4" />
        <p className="text-sm font-black tracking-widest uppercase">Loading Quest Map...</p>
      </div>
    );
  }

  const { child, pet, quests, achievements, rewards } = data;

  // Avatar lookup
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

  const getAvatarTitle = (key: string) => {
    switch(key) {
      case "avatar_knight": return "Noble Knight";
      case "avatar_wizard": return "Spellcaster Wizard";
      case "avatar_ninja": return "Shadow Ninja";
      case "avatar_ranger": return "Nature Ranger";
      case "avatar_unicorn": return "Unicorn Champion";
      default: return "Junior Hero";
    }
  };

  // Simulating Camera capture with pre-uploaded adorable mock canvas
  const simulateCameraCapture = () => {
    playQuestSound("click");
    // adorable pixel graphics mock base64 representation
    setProofPhoto("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    alert("📸 Photo captured successfully!");
  };

  const unreadNotifs = notifications.filter(n => !n.read);

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#1E293B] flex flex-col select-none font-sans relative pb-24">
      
      {/* Brand Header & Character Info */}
      <header className="bg-white border-b-4 border-[#E2E8F0] p-4 md:p-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Avatar and Levels */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#EAF9DE] border-2 border-[#58CC02] border-b-4 rounded-3xl flex items-center justify-center text-4xl shadow-md">
              {getAvatarEmoji(child.avatar)}
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-black text-[#4B4B4B] flex items-center gap-2">
                {child.name}
                <span className="text-[10px] px-2.5 py-0.5 bg-[#DDF4FF] border border-[#1899D6]/10 text-[#1899D6] rounded-full font-black uppercase tracking-wider">{getAvatarTitle(child.avatar)}</span>
              </h2>
              
              {/* Level XP Progress Bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-[#1899D6]">Lvl {child.level}</span>
                <div className="w-36 md:w-48 bg-[#E2E8F0] h-4 rounded-full overflow-hidden border-2 border-[#CBD5E1] relative shadow-inner">
                  <div 
                    className="bg-[#58CC02] h-full transition-all duration-500"
                    style={{ width: `${child.levelProgress.progressPercentage}%` }}
                  />
                  <span className="absolute inset-0 text-[8px] font-black text-center flex items-center justify-center text-[#33551C]">
                    {child.levelProgress.currentLevelXp} / {child.levelProgress.nextLevelXpNeeded} XP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gold Coins and Streak Panels */}
          <div className="flex items-center justify-between md:justify-end gap-4">
            <div className="bg-white border-2 border-[#E2E8F0] border-b-4 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
              <Coins className="w-5 h-5 text-[#FFC800] fill-[#FFC800]/10" />
              <div>
                <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest block">Gold Coins</span>
                <span className="text-sm font-black text-[#FFC800]">{child.coins} 🪙</span>
              </div>
            </div>

            <div className="bg-white border-2 border-[#E2E8F0] border-b-4 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
              <Flame className="w-5 h-5 text-[#FF4B4B] fill-[#FF4B4B]/10" />
              <div>
                <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest block">Quest Streak</span>
                <span className="text-sm font-black text-[#FF4B4B]">{child.streak} Days</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={onLogout}
              className="p-3 bg-[#FFF0F0] border-2 border-[#FF4B4B]/15 hover:bg-[#FFE5E5] text-[#FF4B4B] rounded-2xl cursor-pointer transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main World Container */}
      <main className="max-w-4xl mx-auto p-4 md:p-6 w-full flex-1">
        
        {/* Floating AI Motivation / Message Banner */}
        {data.motivationMessage && (
          <div className="mb-6 bg-gradient-to-r from-[#AF66FF] to-[#8C3FE6] border-b-4 border-[#7A2DC9] rounded-3xl p-5 shadow-lg relative overflow-hidden flex items-center gap-4 text-white">
            <div className="absolute -top-6 -right-6 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-white" />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-xl shrink-0 border border-white/25">
              🔮
            </div>
            <div className="relative z-10">
              <span className="text-[9px] font-black text-white/90 uppercase tracking-widest block mb-1">AI Spirit Guide says:</span>
              <p className="text-xs text-white leading-relaxed font-black italic">"{data.motivationMessage}"</p>
            </div>
          </div>
        )}

        {/* Notifications Bar */}
        {unreadNotifs.length > 0 && (
          <div className="mb-6 space-y-2">
            {unreadNotifs.map(n => (
              <div key={n.id} className="bg-[#DDF4FF] border-2 border-[#1899D6]/10 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-black text-[#1899D6] shadow-sm animate-pulse">
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#1899D6] fill-[#1899D6]/10" />
                  {n.message}
                </span>
                <button 
                  type="button"
                  onClick={() => markNotifRead(n.id)}
                  className="p-1 hover:bg-[#BFE9FF] text-[#1899D6] rounded transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ==========================================
            TAB: QUEST MAP (Quests List)
           ========================================== */}
        {activeMenu === "quests" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-[#4B4B4B] flex items-center gap-2 uppercase tracking-tight">
                  <Compass className="w-5 h-5 text-[#1899D6]" />
                  Your Active Quest Map
                </h3>
                <p className="text-[#64748B] text-xs font-bold mt-1">Conquer quests daily to earn gold coins & level up your pet!</p>
              </div>
            </div>

            {quests.length === 0 ? (
              <div className="bg-white border-2 border-[#E2E8F0] border-b-4 rounded-3xl p-10 text-center text-[#64748B] space-y-2">
                <Compass className="w-12 h-12 mx-auto stroke-2 text-[#CBD5E1]" />
                <p className="font-black text-sm text-[#4B4B4B] uppercase tracking-wider">All quests completed or retired!</p>
                <p className="text-xs">Ask your Parent to assign you some new adventures.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quests.map(q => {
                  const isPendingApproval = q.status === "completed";
                  return (
                    <div 
                      key={q.id} 
                      className={`bg-white border-2 border-[#E2E8F0] border-b-4 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden transition duration-200 ${
                        isPendingApproval ? 'opacity-60 bg-slate-50' : 'hover:translate-y-[-2px] hover:border-[#1899D6]/40'
                      }`}
                    >
                      {/* Quest stats indicator */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                            q.difficulty === "easy" ? "bg-[#EAF9DE] text-[#58CC02] border border-[#58CC02]/10" :
                            q.difficulty === "medium" ? "bg-[#FFF9E6] text-[#FFC800] border border-[#FFC800]/10" : "bg-[#FFF0F0] text-[#FF4B4B] border border-[#FF4B4B]/10"
                          }`}>
                            {q.difficulty} Quest
                          </span>
                          <span className="text-[10px] text-[#64748B] font-black uppercase tracking-wide">Repetition: {q.repetition}</span>
                        </div>

                        <h4 className="font-black text-base text-[#4B4B4B] flex items-center gap-1.5 uppercase tracking-tight">
                          <Sparkles className="w-4 h-4 text-[#1899D6] fill-[#1899D6]/10" />
                          {q.adventureTitle || q.title}
                        </h4>
                        <p className="text-[#64748B] text-xs font-bold mt-1">Goal: <span className="text-[#4B4B4B] lowercase font-black italic">"{q.title}"</span></p>
                      </div>

                      {/* Loot breakdown */}
                      <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-black">
                        <div className="flex gap-2">
                          <span className="text-[#1899D6] bg-[#DDF4FF] border border-[#1899D6]/15 px-2.5 py-1 rounded-lg text-[10px] uppercase">+{q.xp} XP</span>
                          <span className="text-[#FFC800] bg-[#FFF9E6] border border-[#FFC800]/15 px-2.5 py-1 rounded-lg text-[10px] uppercase">+{q.coins} 🪙</span>
                        </div>

                        {isPendingApproval ? (
                          <span className="text-[10px] text-[#FFC800] bg-[#FFF9E6] border border-[#FFC800]/20 px-2.5 py-1.5 rounded-xl flex items-center gap-1 font-black uppercase tracking-wider animate-pulse">
                            <Clock className="w-3.5 h-3.5" /> Waiting for Parent
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setSelectedQuest(q); playQuestSound("click"); }}
                            className="px-4 py-2.5 bg-[#58CC02] hover:bg-[#4EBF02] border-b-4 border-[#46A302] active:border-b-0 active:translate-y-0.5 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                          >
                            Conquer!
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Complete Quest Evidence Submission Modal */}
            {selectedQuest && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white border-2 border-[#E2E8F0] border-b-4 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-xs text-[#64748B] font-bold space-y-4 animate-fade-in">
                  <button 
                    type="button"
                    onClick={() => { setSelectedQuest(null); setProofText(""); setProofPhoto(null); }}
                    className="absolute top-4 right-4 p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#777777] rounded-full border border-[#E2E8F0] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="text-center space-y-2">
                    <span className="text-4xl">⚔️</span>
                    <h3 className="text-lg font-black text-[#4B4B4B] uppercase tracking-wider">Embark: "{selectedQuest.adventureTitle}"</h3>
                    <p className="text-[#64748B] font-bold">Provide proof of task completion to claim your loot!</p>
                  </div>

                  <form onSubmit={handleQuestSubmit} className="space-y-4">
                    {selectedQuest.requireProof === "text" && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-[#64748B] uppercase mb-1">Write a short note of what you learned</label>
                        <textarea
                          required
                          placeholder="e.g. I read chapter 3 of the adventure book today!"
                          value={proofText}
                          onChange={(e) => setProofText(e.target.value)}
                          className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-2xl text-xs font-bold text-[#1E293B] outline-none focus:border-[#1899D6] focus:bg-white h-24 resize-none transition-all"
                        />
                      </div>
                    )}

                    {selectedQuest.requireProof === "photo" && (
                      <div className="space-y-2 text-center">
                        <label className="block text-[10px] font-black text-[#64748B] uppercase text-left mb-2">Simulate Photo Proof</label>
                        {proofPhoto ? (
                          <div className="p-3 bg-[#EAF9DE] border border-[#58CC02] rounded-2xl flex flex-col items-center gap-2">
                            <span className="text-[#58CC02] text-[10px] font-black uppercase tracking-wider">✓ Evidence Locked</span>
                            <button 
                              type="button" 
                              onClick={() => setProofPhoto(null)} 
                              className="text-[10px] text-[#FF4B4B] font-black hover:underline cursor-pointer"
                            >
                              Retake Photo
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={simulateCameraCapture}
                            className="w-full py-8 bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] hover:border-[#1899D6] rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-[#64748B] font-black"
                          >
                            <Camera className="w-8 h-8 text-[#1899D6]" />
                            <span>Capture Camera Photo</span>
                          </button>
                        )}
                      </div>
                    )}

                    {selectedQuest.requireProof === "none" && (
                      <p className="text-center text-[#64748B] py-2 italic font-bold">This quest requires no special evidence. Just push the button!</p>
                    )}

                    <button
                      type="submit"
                      disabled={claiming}
                      className="w-full py-4 bg-[#58CC02] hover:bg-[#4EBF02] border-b-4 border-[#46A302] active:border-b-0 active:translate-y-0.5 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-green-100"
                    >
                      <Send className="w-4 h-4" />
                      {claiming ? "Submitting quest..." : "Claim Gold & XP!"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB: VIRTUAL PET
           ========================================== */}
        {activeMenu === "pet" && (
          <div className="space-y-6 max-w-md mx-auto text-center">
            <div>
              <h3 className="text-lg font-black text-[#4B4B4B] flex items-center justify-center gap-2 uppercase tracking-tight">
                🐲 Virtual Pet Companion
              </h3>
              <p className="text-[#64748B] text-xs font-bold mt-1">Keep your pet happy & level up together!</p>
            </div>

            {/* Large Animated Pet Card */}
            <div className="bg-white border-2 border-[#E2E8F0] border-b-4 rounded-3xl p-6 shadow-md flex flex-col items-center justify-between min-h-[350px] relative overflow-hidden">
              <div className="absolute top-4 right-4 z-10">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase border ${
                  pet.status === "happy" ? "bg-[#EAF9DE] text-[#58CC02] border-[#58CC02]/15" :
                  pet.status === "excited" ? "bg-[#DDF4FF] text-[#1899D6] border-[#1899D6]/15 animate-pulse" : "bg-[#FFF9E6] text-[#FFC800] border-[#FFC800]/15"
                }`}>
                  Pet {pet.status}!
                </span>
              </div>

              {/* CSS Animated visual pet */}
              <div className="py-8 flex flex-col items-center relative">
                {/* Floating magic sparkles */}
                <Sparkles className="w-6 h-6 text-[#1899D6] absolute -top-2 left-0 animate-pulse" />
                <div 
                  id="virtual-pet-visual"
                  className="w-32 h-32 text-7xl flex items-center justify-center filter drop-shadow-md transition-transform duration-500 relative"
                >
                  {/* Selected child's pet emoji */}
                  {child.avatar === "avatar_knight" ? "🐉" : "🐰"}
                </div>
                {/* Shadow beneath pet */}
                <div className="w-20 h-2.5 bg-[#CBD5E1] rounded-full blur-sm mt-2 opacity-60 animate-pulse"></div>
              </div>

              <div className="w-full space-y-4">
                <div className="text-center">
                  <h4 className="font-black text-[#4B4B4B] text-lg uppercase">{pet.name}</h4>
                  <p className="text-xs text-[#64748B] font-bold">Level {pet.level} Guardian Companion</p>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between text-[10px] font-black uppercase text-[#64748B] tracking-wide">
                    <span>Pet Happiness ({pet.happiness}%)</span>
                    <span>{pet.happiness > 50 ? 'Healthy' : 'Hungry'}</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-3.5 rounded-full overflow-hidden border-2 border-[#CBD5E1]">
                    <div 
                      className="bg-[#FF4B4B] h-full transition-all duration-300"
                      style={{ width: `${pet.happiness}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <div className="flex justify-between text-[10px] font-black uppercase text-[#64748B] tracking-wide">
                    <span>Pet Level XP ({pet.xp} / {pet.level * 100})</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-3.5 rounded-full overflow-hidden border-2 border-[#CBD5E1]">
                    <div 
                      className="bg-[#58CC02] h-full transition-all duration-300"
                      style={{ width: `${(pet.xp / (pet.level * 100)) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={feedPet}
                  className="w-full py-4 bg-[#FFC800] hover:bg-[#E2B200] border-b-4 border-[#D9A300] active:border-b-0 active:translate-y-0.5 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-amber-100"
                >
                  <Coins className="w-4 h-4 fill-white/20" />
                  Feed Delicious Snacks (Costs 10 Gold 🪙)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: REWARDS SHOP
           ========================================== */}
        {activeMenu === "shop" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-[#4B4B4B] flex items-center gap-2 uppercase tracking-tight">
                <Coins className="w-5 h-5 text-[#FFC800]" />
                The Hero Rewards Shop
              </h3>
              <p className="text-[#64748B] text-xs font-bold mt-1">Exchange your hard-earned gold coins for real life treats and activities!</p>
            </div>

            {rewards.length === 0 ? (
              <p className="text-[#64748B] text-xs font-bold text-center py-10 bg-white border-2 border-[#E2E8F0] border-b-4 rounded-3xl">Shop is currently out of stock! Ask your parent to stock some rewards.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map(r => {
                  const isPending = r.status === "requested";
                  const isApproved = r.status === "approved";
                  return (
                    <div 
                      key={r.id} 
                      className={`bg-white border-2 border-[#E2E8F0] border-b-4 rounded-3xl p-5 shadow-sm flex items-center justify-between relative overflow-hidden transition duration-200 ${
                        isApproved ? 'border-[#58CC02]/30' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-black text-[#1899D6] uppercase tracking-wider">Treat Option:</span>
                        <h4 className="font-black text-[#4B4B4B] text-sm uppercase">"{r.title}"</h4>
                        <div className="text-[10px] text-[#FFC800] font-black uppercase mt-1">Cost: {r.coinsCost} Coins 🪙</div>
                      </div>

                      {isPending ? (
                        <span className="text-[10px] text-[#FFC800] bg-[#FFF9E6] border border-[#FFC800]/15 px-2.5 py-1.5 rounded-xl font-black uppercase tracking-wider animate-pulse">
                          Pending Approval
                        </span>
                      ) : isApproved ? (
                        <span className="text-[10px] text-[#58CC02] bg-[#EAF9DE] border border-[#58CC02]/15 px-2.5 py-1.5 rounded-xl font-black uppercase tracking-wider">
                          Claimed! Enjoy! 🎉
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => claimReward(r.id, r.coinsCost)}
                          disabled={child.coins < r.coinsCost}
                          className="px-4 py-2 bg-[#FFC800] hover:bg-[#E2B200] border-b-4 border-[#D9A300] active:border-b-0 active:translate-y-0.5 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-30 cursor-pointer"
                        >
                          Claim Reward
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB: BADGES (Achievements)
           ========================================== */}
        {activeMenu === "badges" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-[#4B4B4B] flex items-center gap-2 uppercase tracking-tight">
                <Trophy className="w-5 h-5 text-[#FFC800]" />
                Your Trophy Room & Badges
              </h3>
              <p className="text-[#64748B] text-xs font-bold mt-1">Complete quests and streaks to unlock unique legendary badges!</p>
            </div>

            {achievements.length === 0 ? (
              <p className="text-[#64748B] text-xs font-bold text-center py-10 bg-white border-2 border-[#E2E8F0] border-b-4 rounded-3xl">Keep completing quests to unlock your very first badge!</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {achievements.map((ach: any) => (
                  <div key={ach.id} className="bg-white border-2 border-[#E2E8F0] border-b-4 rounded-3xl p-4 text-center space-y-3 relative overflow-hidden flex flex-col justify-between items-center shadow-md">
                    <div className="absolute top-0 right-0 p-1 bg-[#FFF9E6] text-[#FFC800] border-l border-b border-[#FFC800]/20 text-[8px] font-black uppercase tracking-widest rounded-bl-lg">
                      Legendary
                    </div>
                    
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF9E6] border-2 border-[#FFC800]/20 flex items-center justify-center text-3xl mt-2 animate-pulse">
                      🏆
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-[#4B4B4B] text-xs uppercase tracking-wide">{ach.title}</h4>
                      <p className="text-[10px] text-[#64748B] leading-relaxed font-bold">{ach.description}</p>
                    </div>

                    <span className="text-[9px] text-[#94A3B8] font-bold">Unlocked: {new Date(ach.unlockedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent Gamified Footer Navigation Bar */}
      <footer className="fixed bottom-0 inset-x-0 bg-white border-t-4 border-[#E2E8F0] py-3 px-6 z-40 shadow-xl">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            type="button"
            onClick={() => { setActiveMenu("quests"); playQuestSound("click"); }}
            className={`flex flex-col items-center gap-1 text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all ${
              activeMenu === "quests" ? "text-[#1899D6] scale-105" : "text-[#64748B] hover:text-[#4B4B4B]"
            }`}
          >
            <Compass className="w-5 h-5" />
            Quests
          </button>

          <button
            type="button"
            onClick={() => { setActiveMenu("pet"); playQuestSound("click"); }}
            className={`flex flex-col items-center gap-1 text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all ${
              activeMenu === "pet" ? "text-[#1899D6] scale-105" : "text-[#64748B] hover:text-[#4B4B4B]"
            }`}
          >
            <Heart className="w-5 h-5" />
            My Pet
          </button>

          <button
            type="button"
            onClick={() => { setActiveMenu("shop"); playQuestSound("click"); }}
            className={`flex flex-col items-center gap-1 text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all ${
              activeMenu === "shop" ? "text-[#1899D6] scale-105" : "text-[#64748B] hover:text-[#4B4B4B]"
            }`}
          >
            <Coins className="w-5 h-5" />
            Shop
          </button>

          <button
            type="button"
            onClick={() => { setActiveMenu("badges"); playQuestSound("click"); }}
            className={`flex flex-col items-center gap-1 text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all ${
              activeMenu === "badges" ? "text-[#1899D6] scale-105" : "text-[#64748B] hover:text-[#4B4B4B]"
            }`}
          >
            <Trophy className="w-5 h-5" />
            Trophies
          </button>
        </div>
      </footer>
    </div>
  );
}
