import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, Parent, Child, Quest, Reward, Achievement, QuestHistory, Notification, AIReport, RepetitionType, ProofType } from "./lib/db.js";
import { generateAdventureTitle, generateHabitPlan, generateMotivation, generateParentAdvice, generateWeeklyReport } from "./lib/ai.js";
import { sendOtpEmail } from "./lib/email.js";

const JWT_SECRET = process.env.JWT_SECRET || "habit-quest-epic-secret-key-2026";

export async function createApp() {
  await db.init();
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(async (req, res, next) => {
    if (process.env.VERCEL) {
      await db.init();
    }
    
    // Daily reset check: reset quests completed on previous days
    const todayStr = new Date().toISOString().slice(0, 10);
    let dirty = false;
    db.get().quests.forEach(q => {
      if ((q.status === "completed" || q.status === "verified") && q.lastCompletedAt) {
        // If it was completed before today UTC, reset it
        if (q.lastCompletedAt.slice(0, 10) !== todayStr) {
          q.status = "pending";
          q.proofData = undefined;
          dirty = true;
        }
      }
    });
    if (dirty) await db.save();
    
    next();
  });

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

  // Badge Catalog — single source of truth for all earnable badges
  const BADGE_CATALOG = [
    { id: "first_quest",    title: "First Quest",          description: "Complete your very first quest!",                       icon: "award_star",      emoji: "⭐", requirementText: "Complete 1 task",               type: "quests_total",    threshold: 1  },
    { id: "xp_100",         title: "100 XP Club",          description: "Earn a grand total of 100 XP!",                        icon: "sparkles",        emoji: "✨", requirementText: "Earn 100 XP",                   type: "xp",              threshold: 100 },
    { id: "xp_500",         title: "500 XP Super Star",    description: "Earn a massive total of 500 XP!",                      icon: "trophy",          emoji: "🏆", requirementText: "Earn 500 XP",                   type: "xp",              threshold: 500 },
    { id: "streak_7",       title: "7 Day Streak",         description: "Keep your quest streak alive for 7 straight days!",    icon: "flame",           emoji: "🔥", requirementText: "Maintain a 7-day streak",        type: "streak",          threshold: 7  },
    { id: "streak_15",      title: "15 Day Streak",        description: "Incredible consistency! Keep a 15-day streak!",        icon: "shield",          emoji: "🛡️", requirementText: "Maintain a 15-day streak",       type: "streak",          threshold: 15 },
    { id: "quest_10",       title: "10 Completed Quests",  description: "Defeat 10 monsters and challenges!",                   icon: "shield_alert",    emoji: "🏅", requirementText: "Complete 10 verified tasks",     type: "verified_total",  threshold: 10 },
    { id: "quest_25",       title: "25 Quest Champion",    description: "You've verified 25 quests — unstoppable!",             icon: "trophy",          emoji: "🥇", requirementText: "Complete 25 verified tasks",     type: "verified_total",  threshold: 25 },
    { id: "reading_master", title: "Reading Master",       description: "Complete 3 reading quests!",                           icon: "book_open",       emoji: "📖", requirementText: "Complete 3 reading tasks",       type: "reading",         threshold: 3  },
    { id: "homework_hero",  title: "Homework Hero",        description: "Complete 3 study or homework quests!",                 icon: "graduation_cap",  emoji: "🎓", requirementText: "Complete 3 homework/study tasks", type: "homework",        threshold: 3  },
    { id: "healthy_kid",    title: "Healthy Kid",          description: "Complete 5 health & hygiene quests!",                  icon: "heart",           emoji: "❤️", requirementText: "Complete 5 health/hygiene tasks", type: "health",          threshold: 5  },
    { id: "coins_100",      title: "Coin Collector",       description: "Accumulate 100 coins at once!",                        icon: "sparkles",        emoji: "🪙", requirementText: "Have 100 coins at once",          type: "coins",           threshold: 100 },
  ];

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
    if (child.coins >= 100) addAchievement("Coin Collector", "Accumulated 100 coins at once!", "sparkles");

    const verifiedHistory = history.filter(h => h.status === "verified");
    if (verifiedHistory.length >= 10) addAchievement("10 Completed Quests", "Defeated 10 monsters and challenges!", "shield_alert");
    if (verifiedHistory.length >= 25) addAchievement("25 Quest Champion", "You've verified 25 quests — unstoppable!", "trophy");

    // Use quest.category for reliable badge detection
    const questsForChildById: Record<string, Quest> = {};
    const allQuests = db.get().quests.filter(q => q.childId === child.id);
    allQuests.forEach(q => { questsForChildById[q.id] = q; });

    const readQuests = verifiedHistory.filter(h => {
      const q = questsForChildById[h.questId];
      return q?.category === 'reading' ||
        h.title.toLowerCase().includes("read") ||
        h.adventureTitle.toLowerCase().includes("library") ||
        h.adventureTitle.toLowerCase().includes("reading");
    });
    if (readQuests.length >= 3) addAchievement("Reading Master", "Completed 3 reading quests!", "book_open");

    const homeworkQuests = verifiedHistory.filter(h => {
      const q = questsForChildById[h.questId];
      return q?.category === 'homework' ||
        h.title.toLowerCase().includes("homework") ||
        h.title.toLowerCase().includes("study") ||
        h.adventureTitle.toLowerCase().includes("academy") ||
        h.adventureTitle.toLowerCase().includes("school");
    });
    if (homeworkQuests.length >= 3) addAchievement("Homework Hero", "Completed 3 study or homework quests successfully!", "graduation_cap");

    const healthQuests = verifiedHistory.filter(h => {
      const q = questsForChildById[h.questId];
      return q?.category === 'health' ||
        h.title.toLowerCase().includes("brush") ||
        h.title.toLowerCase().includes("water") ||
        h.adventureTitle.toLowerCase().includes("potion") ||
        h.adventureTitle.toLowerCase().includes("cavity");
    });
    if (healthQuests.length >= 5) addAchievement("Healthy Kid", "Successfully completed health & hygiene quests 5 times!", "heart");

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

  // Register Parent (Compulsory OTP / 2FA)
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const newParent: Parent = {
      id: `p-${generateId()}`,
      email: email.toLowerCase(),
      passwordHash,
      familyName,
      otp,
      otpExpiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    db.get().parents.push(newParent);
    await db.save();
    console.log(`[OTP] Compulsory 2FA OTP ${otp} for registration of ${email}`);
    const isDemoParent = newParent.email.toLowerCase() === "parent@habitquest.com";
    if (!isDemoParent) {
      await sendOtpEmail(newParent.email, otp);
    }
    res.status(201).json({ requireOtp: true, email: newParent.email, message: "Verification code sent!", devOtp: isDemoParent ? otp : undefined });
  });

  // Login Parent (Compulsory OTP / 2FA)
  app.post("/api/auth/login-parent", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const parent = db.get().parents.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!parent || !bcrypt.compareSync(password, parent.passwordHash)) {
      return res.status(400).json({ error: "Invalid email or password." });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    parent.otp = otp;
    parent.otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    await db.save();
    console.log(`[OTP] Compulsory 2FA OTP ${otp} for ${email}`);
    const isDemoParent = parent.email.toLowerCase() === "parent@habitquest.com";
    if (!isDemoParent) {
      await sendOtpEmail(parent.email, otp);
    }
    res.json({ requireOtp: true, email: parent.email, message: "Verification code sent!", devOtp: isDemoParent ? otp : undefined });
  });

  // Send OTP for Parent Login
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    const parent = db.get().parents.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!parent) {
      return res.status(400).json({ error: "No parent account found with this email." });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    parent.otp = otp;
    parent.otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    await db.save();
    console.log(`[OTP] Generated OTP ${otp} for ${email}`);
    const isDemoParent = parent.email.toLowerCase() === "parent@habitquest.com";
    if (!isDemoParent) {
      await sendOtpEmail(parent.email, otp);
    }
    res.json({ success: true, message: "Verification code sent!", devOtp: isDemoParent ? otp : undefined });
  });

  // Verify OTP for Parent Login
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP code are required." });
    }
    const parent = db.get().parents.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!parent || !parent.otp || parent.otp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid verification code." });
    }
    if (parent.otpExpiresAt && Date.now() > parent.otpExpiresAt) {
      return res.status(400).json({ error: "Verification code has expired." });
    }
    parent.otp = undefined;
    parent.otpExpiresAt = undefined;
    await db.save();
    const token = jwt.sign({ id: parent.id, role: "parent" }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, parent: { id: parent.id, email: parent.email, familyName: parent.familyName } });
  });

  // Forgot Password (Send OTP)
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    const parent = db.get().parents.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!parent) {
      return res.status(400).json({ error: "No parent account found with this email address." });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    parent.otp = otp;
    parent.otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    await db.save();
    console.log(`[OTP] Password reset OTP ${otp} for ${email}`);
    const isDemoParent = parent.email.toLowerCase() === "parent@habitquest.com";
    if (!isDemoParent) {
      await sendOtpEmail(parent.email, otp);
    }
    res.json({ success: true, message: "Password reset code sent to your email!", devOtp: isDemoParent ? otp : undefined });
  });

  // Reset Password (Verify OTP & Update Password)
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, verification code, and new password are required." });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "New password must be at least 4 characters long." });
    }
    const parent = db.get().parents.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!parent || !parent.otp || parent.otp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid verification code." });
    }
    if (parent.otpExpiresAt && Date.now() > parent.otpExpiresAt) {
      return res.status(400).json({ error: "Verification code has expired." });
    }
    const salt = bcrypt.genSaltSync(10);
    parent.passwordHash = bcrypt.hashSync(newPassword, salt);
    parent.otp = undefined;
    parent.otpExpiresAt = undefined;
    await db.save();
    console.log(`[AUTH] Password reset successfully for ${email}`);
    res.json({ success: true, message: "Password updated successfully! Please sign in with your new password." });
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

  app.get("/api/parent/children", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const children = db.get().children.filter(c => c.parentId === parentId).map(({ passwordHash, ...child }) => child);
    res.json(children);
  });

  app.post("/api/parent/children", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { name, loginId, password, avatar, age, gender } = req.body;
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
      age: age || 7,
      gender: gender || "boy",
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
    const { name, loginId, password, avatar, petName, age, gender } = req.body;
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
    if (age) child.age = age;
    if (gender) child.gender = gender;
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

  app.get("/api/parent/questHistory", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    // Get all children for this parent
    const childrenIds = db.get().children.filter(c => c.parentId === parentId).map(c => c.id);
    // Return quest history records for these children
    const history = db.get().questHistory.filter(h => childrenIds.includes(h.childId));
    res.json(history);
  });

  // Public badge catalog endpoint
  app.get("/api/badges/catalog", (_req, res) => {
    res.json(BADGE_CATALOG);
  });

  app.get("/api/quests", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    res.json(db.get().quests.filter(q => q.parentId === parentId));
  });

  app.get("/api/parent/quests", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    res.json(db.get().quests.filter(q => q.parentId === parentId));
  });

  app.get("/api/rewards", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    res.json(db.get().rewards.filter(r => r.parentId === parentId));
  });

  app.post("/api/parent/quests", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { childId, title, difficulty, repetition, reminderTime, requireProof, category } = req.body;
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
      category: category || "general",
      repetition,
      xp,
      coins,
      reminderTime: reminderTime || "08:00",
      requireProof: requireProof || "none",
      status: "pending",
      verified: false
    };
    db.get().quests.push(newQuest);
    await db.save();
    res.status(201).json(newQuest);
  });

  app.put("/api/parent/quests/:id", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const { title, difficulty, repetition, reminderTime, requireProof, category, xp, coins } = req.body;
    const questIndex = db.get().quests.findIndex(q => q.id === id && q.parentId === parentId);
    if (questIndex === -1) return res.status(404).json({ error: "Quest not found." });
    const quest = db.get().quests[questIndex];
    if (title && title !== quest.title) {
      quest.title = title;
      quest.adventureTitle = await generateAdventureTitle(title);
    }
    if (difficulty) quest.difficulty = difficulty;
    if (category) quest.category = category;
    if (repetition) quest.repetition = repetition;
    if (reminderTime) quest.reminderTime = reminderTime;
    if (requireProof) quest.requireProof = requireProof;
    if (xp !== undefined) quest.xp = xp;
    if (coins !== undefined) quest.coins = coins;
    await db.save();
    res.json(quest);
  });

  app.delete("/api/parent/quests/:id", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const questIndex = db.get().quests.findIndex(q => q.id === id && q.parentId === parentId);
    if (questIndex === -1) return res.status(404).json({ error: "Quest not found." });
    db.get().quests.splice(questIndex, 1);
    await db.save();
    res.json({ message: "Quest successfully deleted." });
  });

  app.post("/api/parent/quests/:id/verify", authenticateParent, async (req: any, res) => {
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

    // Update Daily Streak
    const todayDate = new Date();
    const todayStr = todayDate.toISOString().slice(0, 10);
    const lastActiveStr = child.lastActiveDate;

    if (lastActiveStr !== todayStr) {
      if (lastActiveStr) {
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(todayDate.getDate() - 1);
        if (lastActiveStr === yesterdayDate.toISOString().slice(0, 10)) {
          child.streak += 1;
        } else {
          child.streak = 1; // Reset streak
        }
      } else {
        child.streak = 1;
      }
      if (child.streak > child.longestStreak) child.longestStreak = child.streak;
      child.lastActiveDate = todayStr;
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

    // We no longer reset to pending immediately — it stays verified for today
    // and the middleware will reset it to pending tomorrow.

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

    await db.save();
    res.json({ success: true, leveledUp, newLevel: child.level, streak: child.streak, newlyUnlocked, quest, child });
  });

  app.post("/api/parent/quests/:id/reject", authenticateParent, async (req: any, res) => {
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
    await db.save();
    res.json({ success: true, quest });
  });

  app.post("/api/parent/rewards", authenticateParent, async (req: any, res) => {
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
    await db.save();
    res.status(201).json(newReward);
  });

  app.post("/api/parent/rewards/:id/approve", authenticateParent, async (req: any, res) => {
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
    await db.save();
    res.json({ success: true, reward });
  });

  app.post("/api/parent/rewards/:id/reject", authenticateParent, async (req: any, res) => {
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
    await db.save();
    res.json({ success: true, reward, child });
  });

  app.get("/api/parent/dashboard", authenticateParent, async (req: any, res) => {
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
      motivationMessage,
      history
    });
  });

  app.post("/api/children/:childId/quests/:questId/submit", authenticateChild, async (req: any, res) => {
    const { childId, questId } = req.params;
    const { proofData } = req.body;
    const quest = db.get().quests.find(q => q.id === questId && q.childId === childId);
    if (!quest) return res.status(404).json({ error: "Quest not found." });
    if (quest.status === "completed" || quest.status === "verified") return res.status(400).json({ error: "Quest already submitted or completed." });

    const child = db.get().children.find(c => c.id === childId);
    if (!child) return res.status(404).json({ error: "Child not found." });

    quest.status = "completed";
    quest.proofData = proofData;
    quest.lastCompletedAt = new Date().toISOString();

    // ── Award XP & coins immediately on submit ──
    child.xp += quest.xp;
    child.coins += quest.coins;

    // ── Level up check ──
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

    // ── Update Daily Streak ──
    const todayStr = new Date().toISOString().slice(0, 10);
    if (child.lastActiveDate !== todayStr) {
      if (child.lastActiveDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        child.streak = child.lastActiveDate === yesterdayStr ? child.streak + 1 : 1;
      } else {
        child.streak = 1;
      }
      if (child.streak > child.longestStreak) child.longestStreak = child.streak;
      child.lastActiveDate = todayStr;
    }

    // ── Pet happiness boost ──
    if (child.pet) {
      child.pet.happiness = Math.min(100, child.pet.happiness + 10);
      child.pet.status = "excited";
      child.pet.xp += Math.round(quest.xp / 4);
      if (child.pet.xp >= child.pet.level * 100) {
        child.pet.xp -= child.pet.level * 100;
        child.pet.level += 1;
      }
    }

    // ── Add to quest history (status verified so badges trigger) ──
    const historyItem: QuestHistory = {
      id: `h-${generateId()}`,
      childId: child.id,
      questId: quest.id,
      title: quest.title,
      adventureTitle: quest.adventureTitle || quest.title,
      xpEarned: quest.xp,
      coinsEarned: quest.coins,
      completedAt: new Date().toISOString(),
      status: "verified",
      proofData: quest.proofData
    };
    db.get().questHistory.push(historyItem);

    // ── Badge check ──
    const allHistory = db.get().questHistory.filter(h => h.childId === child.id);
    const questsForChild = db.get().quests.filter(q => q.childId === child.id);
    const newlyUnlocked = checkAndUnlockAchievements(child, questsForChild, allHistory);

    // ── Notify parent for proof review if needed ──
    if (quest.requireProof !== "none") {
      db.get().notifications.push({
        id: `notif-${generateId()}`,
        userId: quest.parentId,
        role: "parent",
        message: `✨ ${child.name} completed quest "${quest.title}" and submitted proof for review!`,
        createdAt: new Date().toISOString(),
        read: false
      });
    }

    await db.save();
    res.json({ success: true, quest, leveledUp, newLevel: child.level, streak: child.streak, newlyUnlocked, child });
  });

  app.post("/api/children/:id/feed-pet", authenticateChild, async (req: any, res) => {
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
    await db.save();
    res.json({ success: true, petLeveledUp, coins: child.coins, pet: child.pet });
  });

  app.post("/api/children/:childId/rewards/:rewardId/claim", authenticateChild, async (req: any, res) => {
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
    await db.save();
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
    await db.save();
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

  app.post("/api/notifications/:id/read", async (req, res) => {
    const { id } = req.params;
    const notification = db.get().notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      await db.save();
    }
    res.json({ success: true });
  });

  // ==========================================
  // TEAMS & GROUPS API
  // ==========================================

  app.post("/api/teams", authenticateParent, async (req: any, res) => {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Team name is required." });
    
    // Generate 6 character alphanumeric code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newTeam = {
      id: `t-${generateId()}`,
      parentId: req.parent.id,
      name,
      icon: icon || "🏆",
      inviteCode,
      members: [] // No members initially
    };
    
    db.get().teams.push(newTeam);
    await db.save();
    res.json(newTeam);
  });

  app.get("/api/parent/teams", authenticateParent, async (req: any, res) => {
    const teams = db.get().teams.filter(t => t.parentId === req.parent.id);
    // Populate members for parent view
    const populatedTeams = teams.map(t => {
      const members = t.members.map(memberId => {
        const child = db.get().children.find(c => c.id === memberId);
        return child ? { id: child.id, name: child.name, avatar: child.avatar, level: child.level, streak: child.streak } : null;
      }).filter(Boolean);
      return { ...t, members };
    });
    res.json(populatedTeams);
  });

  app.delete("/api/teams/:id", authenticateParent, async (req: any, res) => {
    const parentId = req.parent.id;
    const { id } = req.params;
    const teamIndex = db.get().teams.findIndex(t => t.id === id && t.parentId === parentId);
    if (teamIndex === -1) return res.status(404).json({ error: "Team not found." });
    db.get().teams.splice(teamIndex, 1);
    await db.save();
    res.json({ message: "Team successfully deleted." });
  });

  app.post("/api/children/:childId/join-team", authenticateChild, async (req: any, res) => {
    const { inviteCode } = req.body;
    const { childId } = req.params;
    
    if (req.child.id !== childId) return res.status(403).json({ error: "Forbidden" });
    if (!inviteCode) return res.status(400).json({ error: "Invite code is required." });
    
    const team = db.get().teams.find(t => t.inviteCode === inviteCode.trim().toUpperCase());
    if (!team) return res.status(404).json({ error: "Invalid invite code. Team not found." });
    
    if (team.members.includes(childId)) {
      return res.status(400).json({ error: "You are already in this team!" });
    }
    
    team.members.push(childId);
    await db.save();
    res.json({ success: true, team });
  });

  app.get("/api/children/:childId/teams", authenticateChild, async (req: any, res) => {
    const { childId } = req.params;
    if (req.child.id !== childId) return res.status(403).json({ error: "Forbidden" });
    
    const teams = db.get().teams.filter(t => t.members.includes(childId));
    
    // Populate leaderboards for each team
    const populatedTeams = teams.map(t => {
      const members = t.members.map(memberId => {
        const child = db.get().children.find(c => c.id === memberId);
        return child ? { id: child.id, name: child.name, avatar: child.avatar, level: child.level, xp: child.xp, streak: child.streak } : null;
      }).filter(Boolean);
      
      // Sort members by level (desc) then xp (desc)
      members.sort((a: any, b: any) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.xp - a.xp;
      });
      
      return { ...t, members };
    });
    
    res.json(populatedTeams);
  });

  return app;
}
