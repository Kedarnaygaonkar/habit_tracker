import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, Parent, Child, Quest, Reward, Achievement, QuestHistory, Notification, AIReport, RepetitionType, ProofType } from "./lib/db";
import { generateAdventureTitle, generateHabitPlan, generateMotivation, generateParentAdvice, generateWeeklyReport } from "./lib/ai";

const JWT_SECRET = process.env.JWT_SECRET || "habit-quest-epic-secret-key-2026";

export async function createApp() {
  await db.init();
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Helper: Create unique ID
  const generateId = () => Math.random().toString(36).substring(2, 11);

  // Helper: Level formula calculator
  function getLevelProgress(xp: number) {
    let level = 1;
    let cumulative = 0;
    while (true) {
      const neededForNext = 100 * (level + 1);
      if (xp < cumulative + neededForNext) {
        const currentLevelXp = xp - cumulative;
        const progressPercentage = Math.round((currentLevelXp / neededForNext) * 100);
        return { level, currentLevelXp, nextLevelXpNeeded: neededForNext, progressPercentage };
      }
      cumulative += neededForNext;
      level++;
    }
  }

  // Helper: Trigger and check achievements
  function checkAndUnlockAchievements(child: Child, quests: Quest[], history: QuestHistory[]): Achievement[] {
    const currentAchievements = db.get().achievements.filter(a => a.childId === child.id);
    const unlockedTitles = new Set(currentAchievements.map(a => a.title));
    const newAchievements: Achievement[] = [];

    const addAchievement = (title: string, description: string, icon: string) => {
      if (!unlockedTitles.has(title)) {
        const ach: Achievement = {
          id: `ach-${generateId()}`,
          childId: child.id,
          title,
          description,
          icon,
          unlockedAt: new Date().toISOString()
        };
        db.get().achievements.push(ach);
        newAchievements.push(ach);
        db.get().notifications.push({
          id: `notif-${generateId()}`,
          userId: child.id,
          role: "child",
          message: `🏆 Achievement Unlocked: ${title}!`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    };

    if (history.length >= 1) addAchievement("First Quest", "Completed your very first quest!", "award_star");
    if (child.xp >= 100) addAchievement("100 XP Club", "Earned a grand total of 100 XP!", "sparkles");
    if (child.xp >= 500) addAchievement("500 XP Super Star", "Earned a massive total of 500 XP!", "trophy");
    if (child.streak >= 7) addAchievement("7 Day Streak", "Kept your quest streak alive for 7 straight days!", "flame");
    if (child.streak >= 15) addAchievement("15 Day Streak", "Incredible consistency! Kept a streak of 15 days!", "shield");

    const verifiedHistory = history.filter(h => h.status === "verified");
    const readQuests = verifiedHistory.filter(h => h.title.toLowerCase().includes("read") || h.adventureTitle.toLowerCase().includes("library") || h.adventureTitle.toLowerCase().includes("reading"));
    if (readQuests.length >= 3) addAchievement("Reading Master", "Completed 3 books or reading quests!", "book_open");

    const homeworkQuests = verifiedHistory.filter(h => h.title.toLowerCase().includes("homework") || h.title.toLowerCase().includes("study") || h.adventureTitle.toLowerCase().includes("academy") || h.adventureTitle.toLowerCase().includes("school"));
    if (homeworkQuests.length >= 3) addAchievement("Homework Hero", "Completed 3 study or homework quests successfully!", "graduation_cap");

    const healthQuests = verifiedHistory.filter(h => h.title.toLowerCase().includes("brush") || h.title.toLowerCase().includes("water") || h.adventureTitle.toLowerCase().includes("potion") || h.adventureTitle.toLowerCase().includes("cavity"));
    if (healthQuests.length >= 5) addAchievement("Healthy Kid", "Successfully drank magic potions and defeated the Cavity Monster 5 times!", "heart");

    if (verifiedHistory.length >= 10) addAchievement("10 Completed Quests", "Defeated 10 monsters and challenges!", "shield_alert");

    if (newAchievements.length > 0) db.save();
    return newAchievements;
  }


  // ==========================================
  // AUTH MIDDLEWARES
  // ==========================================
  const authenticateParent = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. Token missing." });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== "parent") {
        return res.status(403).json({ error: "Access forbidden. Parent role required." });
      }
      req.parent = decoded;
      next();
    } catch (e) {
      return res.status(401).json({ error: "Invalid token." });
    }
  };

  const authenticateChild = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. Token missing." });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== "child") {
        return res.status(403).json({ error: "Access forbidden. Child role required." });
      }
      if (req.params.id && req.params.id !== decoded.id) {
        return res.status(403).json({ error: "Access forbidden. You can only access your own data." });
      }
      if (req.params.childId && req.params.childId !== decoded.id) {
        return res.status(403).json({ error: "Access forbidden. You can only access your own data." });
      }
      req.child = decoded;
      next();
    } catch (e) {
      return res.status(401).json({ error: "Invalid token." });
    }
  };


  // ==========================================
  // AUTH API ENDPOINTS
  // ==========================================

  // Register Parent
  app.post("/api/auth/register-parent", async (req, res) => {
    const { email, password, familyName } = req.body;
    if (!email || !password || !familyName) {
      return res.status(400).json({ error: "Email, password, and family name are required." });
    }
    const parentExists = db.get().parents.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (parentExists) {
      return res.status(400).json({ error: "Parent account with this email already exists." });
    }
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const newParent: Parent = {
      id: `p-${generateId()}`,
      email: email.toLowerCase(),
      passwordHash,
      familyName
    };
    db.get().parents.push(newParent);
    await db.save();
    const token = jwt.sign({ id: newParent.id, role: "parent" }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ token, parent: { id: newParent.id, email: newParent.email, familyName: newParent.familyName } });
  });

  // Login Parent
  app.post("/api/auth/login-parent", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const parent = db.get().parents.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!parent || !bcrypt.compareSync(password, parent.passwordHash)) {
      return res.status(400).json({ error: "Invalid email or password." });
    }
    const token = jwt.sign({ id: parent.id, role: "parent" }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, parent: { id: parent.id, email: parent.email, familyName: parent.familyName } });
  });

  // Child Login
  app.post("/api/auth/login-child", async (req, res) => {
    const { loginId, password, name, passcode } = req.body;
    const submittedLoginId = (loginId || name || "").trim().toLowerCase();
    const submittedPassword = password || passcode;
    if (!submittedLoginId || !submittedPassword) {
      return res.status(400).json({ error: "Child login ID and password are required." });
    }
    const child = db.get().children.find(c => c.loginId.toLowerCase() === submittedLoginId);
    if (!child || !bcrypt.compareSync(submittedPassword, child.passwordHash)) {
      return res.status(400).json({ error: "Incorrect child ID or password." });
    }
    const token = jwt.sign({ id: child.id, parentId: child.parentId, role: "child" }, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      token,
      child: { id: child.id, parentId: child.parentId, name: child.name, loginId: child.loginId, avatar: child.avatar, xp: child.xp, coins: child.coins, level: child.level, streak: child.streak }
    });
  });


  // ==========================================
  // PARENT API ENDPOINTS
  // ==========================================

  app.get("/api/parent/children", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    const children = db.get().children.filter(c => c.parentId === parentId).map(({ passwordHash, ...child }) => child);
    res.json(children);
  });

  app.post("/api/parent/children", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { name, loginId, password, avatar } = req.body;
    const normalizedLoginId = (loginId || "").trim().toLowerCase();
    if (!name || !normalizedLoginId || !password || !avatar) {
      return res.status(400).json({ error: "Child name, login ID, password, and avatar are required." });
    }
    const nameExists = db.get().children.some(c => c.parentId === parentId && c.name.toLowerCase() === name.toLowerCase());
    if (nameExists) return res.status(400).json({ error: "A child with this name already exists in your family." });
    const loginIdExists = db.get().children.some(c => c.loginId.toLowerCase() === normalizedLoginId);
    if (loginIdExists) return res.status(400).json({ error: "This child login ID is already taken. Please choose another." });
    const salt = bcrypt.genSaltSync(10);
    const newChild: Child = {
      id: `c-${generateId()}`,
      parentId,
      name,
      loginId: normalizedLoginId,
      passwordHash: bcrypt.hashSync(password, salt),
      avatar,
      xp: 0,
      coins: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      pet: { name: `Mochi the Bunny`, level: 1, xp: 0, happiness: 100, status: "happy", lastFedAt: new Date().toISOString() }
    };
    db.get().children.push(newChild);
    await db.save();
    const { passwordHash, ...publicChild } = newChild;
    res.status(201).json(publicChild);
  });

  app.put("/api/parent/children/:id", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const { name, loginId, password, avatar, petName } = req.body;
    const normalizedLoginId = loginId ? loginId.trim().toLowerCase() : "";
    const childIndex = db.get().children.findIndex(c => c.id === id && c.parentId === parentId);
    if (childIndex === -1) return res.status(404).json({ error: "Child not found." });
    if (normalizedLoginId) {
      const loginIdExists = db.get().children.some(c => c.id !== id && c.loginId.toLowerCase() === normalizedLoginId);
      if (loginIdExists) return res.status(400).json({ error: "This child login ID is already taken. Please choose another." });
    }
    const child = db.get().children[childIndex];
    if (name) child.name = name;
    if (normalizedLoginId) child.loginId = normalizedLoginId;
    if (password) child.passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    if (avatar) child.avatar = avatar;
    if (petName && child.pet) child.pet.name = petName;
    await db.save();
    const { passwordHash, ...publicChild } = child;
    res.json(publicChild);
  });

  app.delete("/api/parent/children/:id", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const childIndex = db.get().children.findIndex(c => c.id === id && c.parentId === parentId);
    if (childIndex === -1) return res.status(404).json({ error: "Child not found." });
    db.get().children.splice(childIndex, 1);
    db.get().quests = db.get().quests.filter(q => q.childId !== id);
    db.get().rewards = db.get().rewards.filter(r => r.childId !== id);
    db.get().achievements = db.get().achievements.filter(a => a.childId !== id);
    db.get().questHistory = db.get().questHistory.filter(h => h.childId !== id);
    db.get().aiReports = db.get().aiReports.filter(r => r.childId !== id);
    await db.save();
    res.json({ message: "Child and all associated data successfully deleted." });
  });

  app.get("/api/quests", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    res.json(db.get().quests.filter(q => q.parentId === parentId));
  });

  app.get("/api/parent/quests", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    res.json(db.get().quests.filter(q => q.parentId === parentId));
  });

  app.get("/api/rewards", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    res.json(db.get().rewards.filter(r => r.parentId === parentId));
  });

  app.post("/api/parent/quests", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { childId, title, difficulty, repetition, reminderTime, requireProof } = req.body;
    if (!childId || !title || !difficulty || !repetition) {
      return res.status(400).json({ error: "Child, title, difficulty, and repetition style are required." });
    }
    const child = db.get().children.find(c => c.id === childId && c.parentId === parentId);
    if (!child) return res.status(404).json({ error: "Selected child not found." });
    const difficultyRewards: Record<string, { xp: number; coins: number }> = {
      easy: { xp: 20, coins: 5 },
      medium: { xp: 50, coins: 15 },
      hard: { xp: 100, coins: 30 }
    };
    const { xp, coins } = difficultyRewards[difficulty] || { xp: 20, coins: 5 };
    const adventureTitle = await generateAdventureTitle(title);
    const newQuest: Quest = {
      id: `q-${generateId()}`,
      parentId,
      childId,
      title,
      adventureTitle,
      difficulty,
      repetition,
      xp,
      coins,
      reminderTime: reminderTime || "08:00",
      requireProof: requireProof || "none",
      status: "pending",
      verified: false
    };
    db.get().quests.push(newQuest);
    db.save();
    res.status(201).json(newQuest);
  });

  app.put("/api/parent/quests/:id", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const { title, difficulty, repetition, reminderTime, requireProof, xp, coins } = req.body;
    const questIndex = db.get().quests.findIndex(q => q.id === id && q.parentId === parentId);
    if (questIndex === -1) return res.status(404).json({ error: "Quest not found." });
    const quest = db.get().quests[questIndex];
    if (title && title !== quest.title) {
      quest.title = title;
      quest.adventureTitle = await generateAdventureTitle(title);
    }
    if (difficulty) quest.difficulty = difficulty;
    if (repetition) quest.repetition = repetition;
    if (reminderTime) quest.reminderTime = reminderTime;
    if (requireProof) quest.requireProof = requireProof;
    if (xp !== undefined) quest.xp = xp;
    if (coins !== undefined) quest.coins = coins;
    db.save();
    res.json(quest);
  });

  app.delete("/api/parent/quests/:id", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const questIndex = db.get().quests.findIndex(q => q.id === id && q.parentId === parentId);
    if (questIndex === -1) return res.status(404).json({ error: "Quest not found." });
    db.get().quests.splice(questIndex, 1);
    db.save();
    res.json({ message: "Quest successfully deleted." });
  });

  app.post("/api/parent/quests/:id/verify", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const quest = db.get().quests.find(q => q.id === id && q.parentId === parentId);
    if (!quest) return res.status(404).json({ error: "Quest not found." });
    if (quest.status !== "completed") return res.status(400).json({ error: "Quest is not in a submitted/completed state to verify." });
    const child = db.get().children.find(c => c.id === quest.childId && c.parentId === parentId);
    if (!child) return res.status(404).json({ error: "Associated child not found." });

    quest.status = "verified";
    quest.verified = true;
    quest.lastCompletedAt = new Date().toISOString();

    child.xp += quest.xp;
    child.coins += quest.coins;

    const levelInfo = getLevelProgress(child.xp);
    let leveledUp = false;
    if (levelInfo.level > child.level) {
      child.level = levelInfo.level;
      leveledUp = true;
      db.get().notifications.push({
        id: `notif-${generateId()}`,
        userId: child.id,
        role: "child",
        message: `🎉 LEVEL UP! You are now Level ${child.level}! You've gained magical strength!`,
        createdAt: new Date().toISOString(),
        read: false
      });
    }

    // Update Daily Streak — only once per calendar day
    const today = new Date().toISOString().slice(0, 10);
    const lastCompleted = quest.lastCompletedAt ? quest.lastCompletedAt.slice(0, 10) : null;
    if (lastCompleted !== today) {
      child.streak += 1;
      if (child.streak > child.longestStreak) child.longestStreak = child.streak;
    }

    if (child.pet) {
      child.pet.happiness = Math.min(100, child.pet.happiness + 15);
      child.pet.status = "excited";
      child.pet.xp += Math.round(quest.xp / 2);
      if (child.pet.xp >= child.pet.level * 100) {
        child.pet.xp -= child.pet.level * 100;
        child.pet.level += 1;
        db.get().notifications.push({
          id: `notif-${generateId()}`,
          userId: child.id,
          role: "child",
          message: `🐉 Your pet ${child.pet.name} leveled up to Level ${child.pet.level}!`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }

    const historyItem: QuestHistory = {
      id: `h-${generateId()}`,
      childId: child.id,
      questId: quest.id,
      title: quest.title,
      adventureTitle: quest.adventureTitle,
      xpEarned: quest.xp,
      coinsEarned: quest.coins,
      completedAt: new Date().toISOString(),
      status: "verified",
      proofData: quest.proofData
    };
    db.get().questHistory.push(historyItem);

    quest.status = "pending";
    quest.proofData = undefined;

    const allHistory = db.get().questHistory.filter(h => h.childId === child.id);
    const questsForChild = db.get().quests.filter(q => q.childId === child.id);
    const newlyUnlocked = checkAndUnlockAchievements(child, questsForChild, allHistory);

    db.get().notifications.push({
      id: `notif-${generateId()}`,
      userId: parentId,
      role: "parent",
      message: `Verified quest "${quest.title}" for ${child.name}. Gained +${quest.xp} XP / +${quest.coins} Coins!`,
      createdAt: new Date().toISOString(),
      read: false
    });

    db.save();
    res.json({ success: true, leveledUp, newLevel: child.level, streak: child.streak, newlyUnlocked, quest, child });
  });

  app.post("/api/parent/quests/:id/reject", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const { comment } = req.body;
    const quest = db.get().quests.find(q => q.id === id && q.parentId === parentId);
    if (!quest) return res.status(404).json({ error: "Quest not found." });
    if (quest.status !== "completed") return res.status(400).json({ error: "Quest is not completed to reject." });
    quest.status = "pending";
    quest.proofData = undefined;
    db.get().notifications.push({
      id: `notif-${generateId()}`,
      userId: quest.childId,
      role: "child",
      message: `⚠️ Quest rejected by parent: "${quest.adventureTitle}". Reason: ${comment || "Please try again!"}`,
      createdAt: new Date().toISOString(),
      read: false
    });
    db.save();
    res.json({ success: true, quest });
  });

  app.post("/api/parent/rewards", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    const { childId, title, coinsCost } = req.body;
    if (!childId || !title || !coinsCost) return res.status(400).json({ error: "Child ID, reward title, and coin cost are required." });
    const newReward: Reward = {
      id: `r-${generateId()}`,
      parentId,
      childId,
      title,
      coinsCost: parseInt(coinsCost, 10),
      status: "available"
    };
    db.get().rewards.push(newReward);
    db.save();
    res.status(201).json(newReward);
  });

  app.post("/api/parent/rewards/:id/approve", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const reward = db.get().rewards.find(r => r.id === id && r.parentId === parentId);
    if (!reward) return res.status(404).json({ error: "Reward not found." });
    if (reward.status !== "requested") return res.status(400).json({ error: "Reward is not currently pending child request." });
    reward.status = "approved";
    db.get().notifications.push({
      id: `notif-${generateId()}`,
      userId: reward.childId,
      role: "child",
      message: `🎁 Your reward was approved! Parent says: Enjoy your "${reward.title}"!`,
      createdAt: new Date().toISOString(),
      read: false
    });
    db.save();
    res.json({ success: true, reward });
  });

  app.post("/api/parent/rewards/:id/reject", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const { comment } = req.body;
    const reward = db.get().rewards.find(r => r.id === id && r.parentId === parentId);
    if (!reward) return res.status(404).json({ error: "Reward not found." });
    if (reward.status !== "requested") return res.status(400).json({ error: "Reward is not currently pending child request." });
    const child = db.get().children.find(c => c.id === reward.childId);
    if (child) child.coins += reward.coinsCost;
    reward.status = "rejected";
    db.get().notifications.push({
      id: `notif-${generateId()}`,
      userId: reward.childId,
      role: "child",
      message: `❌ Reward request was declined: "${reward.title}". Coins refunded! Reason: ${comment || "Talk with parent."}`,
      createdAt: new Date().toISOString(),
      read: false
    });
    db.save();
    res.json({ success: true, reward, child });
  });

  app.get("/api/parent/dashboard", authenticateParent, (req: any, res) => {
    const parentId = req.parent.id;
    const children = db.get().children.filter(c => c.parentId === parentId);
    const quests = db.get().quests.filter(q => q.parentId === parentId);
    const rewards = db.get().rewards.filter(r => r.parentId === parentId);
    const reports = db.get().aiReports.filter(r => r.parentId === parentId);
    const totalQuests = quests.length;
    const pendingVerification = quests.filter(q => q.status === "completed").length;
    const childrenStats = children.map(c => {
      const childQuests = quests.filter(q => q.childId === c.id);
      const childHistory = db.get().questHistory.filter(h => h.childId === c.id);
      const childRewards = rewards.filter(r => r.childId === c.id);
      const totalDone = childHistory.filter(h => h.status === "verified").length;
      const totalAll = childQuests.length + totalDone;
      const completionRate = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
      const counts: { [key: string]: number } = {};
      childHistory.forEach(h => { counts[h.title] = (counts[h.title] || 0) + 1; });
      let bestQuest = "None";
      let maxCount = 0;
      Object.keys(counts).forEach(k => { if (counts[k] > maxCount) { maxCount = counts[k]; bestQuest = k; } });
      return { id: c.id, name: c.name, avatar: c.avatar, loginId: c.loginId, level: c.level, xp: c.xp, coins: c.coins, streak: c.streak, longestStreak: c.longestStreak, bestQuest, completionRate, questsCount: childQuests.length, rewardsCount: childRewards.length, pet: c.pet };
    });
    res.json({ familyName: db.get().parents.find(p => p.id === parentId)?.familyName || "Adventures", totalChildren: children.length, pendingVerification, childrenStats, reports });
  });


  // ==========================================
  // CHILD API ENDPOINTS
  // ==========================================

  app.get("/api/children/:id/dashboard", authenticateChild, async (req: any, res) => {
    const { id } = req.params;
    const child = db.get().children.find(c => c.id === id);
    if (!child) return res.status(404).json({ error: "Child not found." });
    const levelInfo = getLevelProgress(child.xp);
    const quests = db.get().quests.filter(q => q.childId === id);
    const achievements = db.get().achievements.filter(a => a.childId === id);
    const rewards = db.get().rewards.filter(r => r.childId === id);
    const history = db.get().questHistory.filter(h => h.childId === id);
    const notifications = db.get().notifications.filter(n => n.userId === id && !n.read);
    const completedRecently = history.slice(-3).map(h => h.title).join(", ");
    const motivationMessage = await generateMotivation(child.name, completedRecently || "Starting new habits!");
    res.json({
      child: { id: child.id, name: child.name, avatar: child.avatar, coins: child.coins, xp: child.xp, streak: child.streak, longestStreak: child.longestStreak, level: child.level, levelProgress: levelInfo },
      pet: child.pet,
      quests,
      achievements,
      rewards,
      notifications,
      motivationMessage
    });
  });

  app.post("/api/children/:childId/quests/:questId/submit", authenticateChild, (req: any, res) => {
    const { childId, questId } = req.params;
    const { proofData } = req.body;
    const quest = db.get().quests.find(q => q.id === questId && q.childId === childId);
    if (!quest) return res.status(404).json({ error: "Quest not found." });
    if (quest.status === "completed" || quest.status === "verified") return res.status(400).json({ error: "Quest already submitted or completed." });
    quest.status = "completed";
    quest.proofData = proofData;
    db.get().notifications.push({
      id: `notif-${generateId()}`,
      userId: quest.parentId,
      role: "parent",
      message: `✨ ${db.get().children.find(c => c.id === childId)?.name} completed quest "${quest.title}" and is waiting for your verification!`,
      createdAt: new Date().toISOString(),
      read: false
    });
    db.save();
    res.json({ success: true, quest });
  });

  app.post("/api/children/:id/feed-pet", authenticateChild, (req: any, res) => {
    const { id } = req.params;
    const child = db.get().children.find(c => c.id === id);
    if (!child) return res.status(404).json({ error: "Child not found." });
    const FEED_COST = 10;
    if (child.coins < FEED_COST) return res.status(400).json({ error: "Not enough coins to buy snacks!" });
    child.coins -= FEED_COST;
    child.pet.happiness = Math.min(100, child.pet.happiness + 20);
    child.pet.status = "happy";
    child.pet.xp += 30;
    child.pet.lastFedAt = new Date().toISOString();
    let petLeveledUp = false;
    const nextPetLevelThreshold = child.pet.level * 100;
    if (child.pet.xp >= nextPetLevelThreshold) {
      child.pet.xp -= nextPetLevelThreshold;
      child.pet.level += 1;
      petLeveledUp = true;
      db.get().notifications.push({
        id: `notif-${generateId()}`,
        userId: child.id,
        role: "child",
        message: `🐉 Your pet ${child.pet.name} leveled up to Level ${child.pet.level}!`,
        createdAt: new Date().toISOString(),
        read: false
      });
    }
    db.save();
    res.json({ success: true, petLeveledUp, coins: child.coins, pet: child.pet });
  });

  app.post("/api/children/:childId/rewards/:rewardId/claim", authenticateChild, (req: any, res) => {
    const { childId, rewardId } = req.params;
    const child = db.get().children.find(c => c.id === childId);
    const reward = db.get().rewards.find(r => r.id === rewardId && r.childId === childId);
    if (!child || !reward) return res.status(404).json({ error: "Child or reward not found." });
    if (reward.status !== "available") return res.status(400).json({ error: "Reward is not available for claiming." });
    if (child.coins < reward.coinsCost) return res.status(400).json({ error: "You don't have enough coins yet! Complete more quests!" });
    child.coins -= reward.coinsCost;
    reward.status = "requested";
    db.get().notifications.push({
      id: `notif-${generateId()}`,
      userId: reward.parentId,
      role: "parent",
      message: `🎁 ${child.name} has claimed the reward "${reward.title}"! They spent ${reward.coinsCost} coins. Please approve it!`,
      createdAt: new Date().toISOString(),
      read: false
    });
    db.save();
    res.json({ success: true, child, reward });
  });


  // ==========================================
  // AI INTEGRATED API ENDPOINTS
  // ==========================================

  app.post("/api/ai/plan", authenticateParent, async (req, res) => {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: "A brief description of your child's needs is required." });
    const plan = await generateHabitPlan(description);
    res.json(plan);
  });

  app.post("/api/ai/assistant", authenticateParent, async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question is required." });
    const advice = await generateParentAdvice(question);
    res.json({ advice });
  });

  app.post("/api/ai/report", authenticateParent, async (req: any, res) => {
    const { childId } = req.body;
    const parentId = req.parent.id;
    const child = db.get().children.find(c => c.id === childId && c.parentId === parentId);
    if (!child) return res.status(404).json({ error: "Child not found." });
    const childHistory = db.get().questHistory.filter(h => h.childId === childId);
    const completedCount = childHistory.filter(h => h.status === "verified").length;
    const totalCount = db.get().quests.filter(q => q.childId === childId).length + completedCount;
    const reportData = await generateWeeklyReport(child.name, completedCount, totalCount, child.streak);
    const newReport: AIReport = {
      id: `rep-${generateId()}`,
      childId,
      parentId,
      createdAt: new Date().toISOString(),
      ...reportData
    };
    db.get().aiReports.push(newReport);
    db.save();
    res.json(newReport);
  });


  // ==========================================
  // NOTIFICATIONS & GENERAL API ENDPOINTS
  // ==========================================

  app.get("/api/notifications/:userId", (req, res) => {
    const { userId } = req.params;
    const list = db.get().notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    const { id } = req.params;
    const notification = db.get().notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      db.save();
    }
    res.json({ success: true });
  });

  return app;
}
