import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { MongoClient, Collection, Db } from "mongodb";

// Types matching the MongoDB design requirements
export interface Parent {
  id: string;
  email: string;
  passwordHash: string;
  familyName: string;
}

export interface VirtualPet {
  name: string;
  level: number;
  xp: number;
  happiness: number; // 0 to 100
  status: "happy" | "sleepy" | "excited" | "hungry";
  lastFedAt: string;
}

export interface Child {
  id: string;
  parentId: string;
  name: string;
  loginId: string; // parent-assigned child login ID
  passwordHash: string; // hashed child password
  passcode?: string; // legacy 4-digit passcode kept only for migrating old local data
  avatar: string; // avatar key or url
  xp: number;
  coins: number;
  level: number;
  streak: number;
  longestStreak: number;
  pet: VirtualPet;
}

export type RepetitionType = "daily" | "weekly" | "monthly";
export type ProofType = "photo" | "text" | "none";
export type QuestStatus = "pending" | "completed" | "verified" | "rejected";

export interface Quest {
  id: string;
  parentId: string;
  childId: string;
  title: string;          // e.g., "Brush Teeth"
  adventureTitle: string; // AI generated, e.g., "Defeat the Cavity Monster"
  difficulty: "easy" | "medium" | "hard";
  repetition: RepetitionType;
  xp: number;
  coins: number;
  reminderTime: string; // e.g., "08:00"
  requireProof: ProofType;
  status: QuestStatus;
  verified: boolean;
  lastCompletedAt?: string;
  proofData?: string; // proof text or photo base64
}

export interface Reward {
  id: string;
  parentId: string;
  childId: string;
  title: string;
  coinsCost: number;
  status: "available" | "requested" | "approved" | "rejected";
}

export interface Achievement {
  id: string;
  childId: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface QuestHistory {
  id: string;
  childId: string;
  questId: string;
  title: string;
  adventureTitle: string;
  xpEarned: number;
  coinsEarned: number;
  completedAt: string;
  status: "completed" | "verified" | "rejected";
  proofData?: string;
}

export interface Notification {
  id: string;
  userId: string; // Parent or Child ID
  role: "parent" | "child";
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AIReport {
  id: string;
  childId: string;
  parentId: string;
  createdAt: string;
  habitScore: number; // 0 to 100
  completionRate: number; // percentage
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  bestTimeOfDay: string;
  parentSummary: string;
}

export interface Schema {
  parents: Parent[];
  children: Child[];
  quests: Quest[];
  rewards: Reward[];
  achievements: Achievement[];
  questHistory: QuestHistory[];
  notifications: Notification[];
  aiReports: AIReport[];
}

interface AppStateDocument {
  _id: string;
  schema: Schema;
  updatedAt?: Date;
}

const DB_FILE = path.join(process.cwd(), "db.json");
const STATE_DOCUMENT_ID = "habitquest-state";

function getInitialData(): Schema {
  const salt = bcrypt.genSaltSync(10);
  const parentPasswordHash = bcrypt.hashSync("password123", salt);

  const parentId = "p-sample";
  const child1Id = "c-leo";
  const child2Id = "c-emma";

  return {
    parents: [
      {
        id: parentId,
        email: "parent@habitquest.com",
        passwordHash: parentPasswordHash,
        familyName: "Adventures"
      }
    ],
    children: [
      {
        id: child1Id,
        parentId: parentId,
        name: "Leo",
        loginId: "leo",
        passwordHash: bcrypt.hashSync("1234", salt),
        passcode: "1234",
        avatar: "avatar_knight",
        xp: 450,
        coins: 120,
        level: 2,
        streak: 5,
        longestStreak: 12,
        pet: {
          name: "Sparky the Dragon",
          level: 2,
          xp: 150,
          happiness: 85,
          status: "happy",
          lastFedAt: new Date().toISOString()
        }
      },
      {
        id: child2Id,
        parentId: parentId,
        name: "Emma",
        loginId: "emma",
        passwordHash: bcrypt.hashSync("5678", salt),
        passcode: "5678",
        avatar: "avatar_wizard",
        xp: 950,
        coins: 40,
        level: 4,
        streak: 18,
        longestStreak: 25,
        pet: {
          name: "Mochi the Bunny",
          level: 4,
          xp: 450,
          happiness: 95,
          status: "excited",
          lastFedAt: new Date().toISOString()
        }
      }
    ],
    quests: [
      {
        id: "q-1",
        parentId: parentId,
        childId: child1Id,
        title: "Brush Teeth",
        adventureTitle: "Defeat the Cavity Monster",
        difficulty: "easy",
        repetition: "daily",
        xp: 20,
        coins: 5,
        reminderTime: "08:00",
        requireProof: "none",
        status: "pending",
        verified: false
      },
      {
        id: "q-2",
        parentId: parentId,
        childId: child1Id,
        title: "Read Book",
        adventureTitle: "Discover the Lost Library",
        difficulty: "medium",
        repetition: "daily",
        xp: 50,
        coins: 15,
        reminderTime: "19:30",
        requireProof: "text",
        status: "pending",
        verified: false
      },
      {
        id: "q-3",
        parentId: parentId,
        childId: child1Id,
        title: "Do Homework",
        adventureTitle: "Complete the Wizard Academy Challenge",
        difficulty: "hard",
        repetition: "daily",
        xp: 100,
        coins: 30,
        reminderTime: "16:00",
        requireProof: "photo",
        status: "pending",
        verified: false
      },
      {
        id: "q-4",
        parentId: parentId,
        childId: child2Id,
        title: "Clean Room",
        adventureTitle: "Organize the Kingdom of Chaos",
        difficulty: "medium",
        repetition: "weekly",
        xp: 60,
        coins: 20,
        reminderTime: "10:00",
        requireProof: "photo",
        status: "pending",
        verified: false
      },
      {
        id: "q-5",
        parentId: parentId,
        childId: child2Id,
        title: "Drink Water",
        adventureTitle: "Drink the Magic Potion",
        difficulty: "easy",
        repetition: "daily",
        xp: 10,
        coins: 2,
        reminderTime: "12:00",
        requireProof: "none",
        status: "pending",
        verified: false
      }
    ],
    rewards: [
      {
        id: "r-1",
        parentId: parentId,
        childId: child1Id,
        title: "30 Minutes TV Time",
        coinsCost: 20,
        status: "available"
      },
      {
        id: "r-2",
        parentId: parentId,
        childId: child1Id,
        title: "Ice Cream Treat",
        coinsCost: 50,
        status: "available"
      },
      {
        id: "r-3",
        parentId: parentId,
        childId: child2Id,
        title: "Movie Night Choice",
        coinsCost: 80,
        status: "available"
      }
    ],
    achievements: [
      {
        id: "a-1",
        childId: child1Id,
        title: "First Quest",
        description: "Completed your very first quest!",
        icon: "award_star",
        unlockedAt: new Date().toISOString()
      },
      {
        id: "a-2",
        childId: child2Id,
        title: "First Quest",
        description: "Completed your very first quest!",
        icon: "award_star",
        unlockedAt: new Date().toISOString()
      },
      {
        id: "a-3",
        childId: child2Id,
        title: "18 Day Streak",
        description: "Maintained a quest streak for 18 days!",
        icon: "flame",
        unlockedAt: new Date().toISOString()
      }
    ],
    questHistory: [
      {
        id: "h-1",
        childId: child1Id,
        questId: "q-1",
        title: "Brush Teeth",
        adventureTitle: "Defeat the Cavity Monster",
        xpEarned: 20,
        coinsEarned: 5,
        completedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        status: "verified"
      },
      {
        id: "h-2",
        childId: child2Id,
        questId: "q-5",
        title: "Drink Water",
        adventureTitle: "Drink the Magic Potion",
        xpEarned: 10,
        coinsEarned: 2,
        completedAt: new Date().toISOString(),
        status: "verified"
      }
    ],
    notifications: [],
    aiReports: [
      {
        id: "rep-1",
        childId: child1Id,
        parentId: parentId,
        createdAt: new Date().toISOString(),
        habitScore: 78,
        completionRate: 80,
        strengths: ["Excellent brushing habits", "Highly engaged in reading"],
        weaknesses: ["Often postpones evening routines", "Homework completion drops on Thursdays"],
        recommendations: ["Set reading quest exactly 30 minutes before bed", "Gamify the homework quest with extra XP booster"],
        bestTimeOfDay: "Morning",
        parentSummary: "Leo is responding extremely well to gamification. His reading habit has seen a massive 40% increase in consistency. Focus on evening routines to maintain the streak!"
      }
    ]
  };
}

export class DBEngine {
  private schema: Schema;
  private client: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private collection: Collection<AppStateDocument> | null = null;

  constructor() {
    this.schema = getInitialData();
  }

  public async init() {
    this.schema = await this.load();
  }

  private async load(): Promise<Schema> {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      try {
        this.client = new MongoClient(mongoUri);
        await this.client.connect();
        this.mongoDb = this.client.db(process.env.MONGODB_DB || "habitquest");
        this.collection = this.mongoDb.collection<AppStateDocument>("app_state");

        const stored = await this.collection.findOne({ _id: STATE_DOCUMENT_ID });
        if (stored?.schema) {
          const normalized = this.normalizeSchema(stored.schema);
          await this.saveData(normalized);
          console.log("Loaded HabitQuest data from MongoDB Atlas.");
          return normalized;
        }
      } catch (e) {
        console.error("Failed to connect to MongoDB Atlas, falling back to db.json.", e);
        this.collection = null;
        this.mongoDb = null;
        this.client = null;
      }
    }

    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = this.normalizeSchema(JSON.parse(fileContent));
        await this.saveData(parsed);
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse db.json, generating new data...", e);
    }

    const initialData = getInitialData();
    await this.saveData(initialData);
    return initialData;
  }

  private normalizeSchema(data: Schema): Schema {
    const salt = bcrypt.genSaltSync(10);
    data.parents = data.parents || [];
    data.children = (data.children || []).map((child) => {
      const legacyPasscode = child.passcode || "1234";
      return {
        ...child,
        loginId: child.loginId || child.name.toLowerCase().replace(/[^a-z0-9]+/g, ""),
        passwordHash: child.passwordHash || bcrypt.hashSync(legacyPasscode, salt),
      };
    });
    data.quests = data.quests || [];
    data.rewards = data.rewards || [];
    data.achievements = data.achievements || [];
    data.questHistory = data.questHistory || [];
    data.notifications = data.notifications || [];
    data.aiReports = data.aiReports || [];
    return data;
  }

  private async saveData(data: Schema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to db.json", e);
    }

    if (this.collection) {
      try {
        await this.collection.updateOne(
          { _id: STATE_DOCUMENT_ID },
          { $set: { schema: data, updatedAt: new Date() } },
          { upsert: true }
        );
        await this.syncCollections(data);
      } catch (e) {
        console.error("Failed to write to MongoDB Atlas", e);
        throw e;
      }
    }
  }


  private async syncCollections(data: Schema) {
    if (!this.mongoDb) return;

    const collections: Array<[keyof Schema, unknown[]]> = [
      ["parents", data.parents],
      ["children", data.children],
      ["quests", data.quests],
      ["rewards", data.rewards],
      ["achievements", data.achievements],
      ["questHistory", data.questHistory],
      ["notifications", data.notifications],
      ["aiReports", data.aiReports],
    ];

    for (const [name, items] of collections) {
      const collection = this.mongoDb.collection(String(name));
      await collection.deleteMany({});
      if (items.length > 0) {
        await collection.insertMany(items.map((item) => ({ ...(item as object) })));
      }
    }
  }
  public get(): Schema {
    return this.schema;
  }

  public async save() {
    await this.saveData(this.schema);
  }
}

export const db = new DBEngine();










