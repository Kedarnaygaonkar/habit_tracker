# 🏰 HabitQuest

> **A gamified family habit tracker** — turn chores into epic quests, earn XP & coins, and raise a virtual pet!

![HabitQuest Banner](https://img.shields.io/badge/HabitQuest-Gamified%20Habit%20Tracker-6366f1?style=for-the-badge&logo=sparkles)
![React](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)

---

## ✨ What is HabitQuest?

HabitQuest transforms everyday habits into an **RPG adventure** for kids. Parents assign habits as **quests**, children complete them to earn **XP, coins, and level up**, and an AI-powered companion keeps everyone motivated.

### 👨‍👩‍👧 For Parents
- Create and manage habit **quests** per child (daily, weekly, monthly)
- Set difficulty levels — Easy → Medium → Hard (auto-assigns XP & coins)
- Review and **verify** quest submissions with proof (photo or text)
- Create a **reward shop** (e.g. "30 min TV time = 20 coins")
- Approve or reject reward redemption requests
- Get **AI-generated weekly progress reports** per child
- Ask the **AI Parenting Assistant** for personalized advice

### 🧒 For Children
- See quests with fun **AI-generated adventure titles** ("Brush Teeth" → "Defeat the Cavity Monster!")
- Submit quest completions with optional text/photo proof
- Earn **XP, coins, and level up** your hero
- Raise and feed a **virtual pet** that grows with you
- Unlock **achievement badges** for streaks, XP milestones, and categories
- Spend coins in the **reward shop**

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| **Backend** | Express.js + Node.js (TypeScript) |
| **Database** | MongoDB Atlas (+ local `db.json` fallback) |
| **Auth** | JWT (30-day tokens) + bcrypt |
| **AI** | Google Gemini 2.0 Flash |
| **Deployment** | Vercel (serverless) |
| **Animations** | Framer Motion + canvas-confetti |
| **Charts** | Recharts |

---

## 📁 Project Structure

```
habitquest/
├── frontend/              # React + Vite app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── LandingPage.tsx
│   │       ├── ParentDashboard.tsx
│   │       └── ChildDashboard.tsx
│   ├── index.html
│   └── vite.config.ts
│
├── backend/               # Express API
│   ├── lib/
│   │   ├── db.ts          # MongoDB + JSON persistence
│   │   └── ai.ts          # Gemini AI helpers
│   └── app.ts             # Express app factory (no listen)
│
├── api/
│   └── index.ts           # Vercel serverless entry point
│
├── server.ts              # Local dev server (Vite + Express)
├── vercel.json            # Vercel routing config
└── package.json
```

---

## 🚀 Getting Started (Local)

### Prerequisites
- Node.js 18+
- A Gemini API key ([get one here](https://aistudio.google.com/))
- (Optional) MongoDB Atlas URI for persistent storage

### 1. Clone the repo
```bash
git clone https://github.com/Kedarnaygaonkar/habit_tracker.git
cd habit_tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_strong_random_secret
MONGODB_URI=your_mongodb_atlas_uri       # optional, uses db.json if omitted
MONGODB_DB=Habit_tracker                 # optional
```

### 4. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 🔑 Demo Credentials (pre-seeded)
| Role | Login | Password |
|---|---|---|
| Parent | `parent@habitquest.com` | `password123` |
| Child 1 | `leo` | `1234` |
| Child 2 | `emma` | `5678` |

---

## 🌐 Deploy to Vercel

1. **Push to GitHub** (already done ✅)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo
3. Set these **Environment Variables** in the Vercel dashboard:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `JWT_SECRET` | A strong random secret |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `MONGODB_DB` | `Habit_tracker` |

4. Click **Deploy** — Vercel auto-detects `vercel.json` ✅

> ⚠️ **Important:** MongoDB Atlas is required for Vercel deployment. The local `db.json` file does not persist on Vercel's ephemeral filesystem.

---

## 🎮 Game Mechanics

### XP & Leveling
| Difficulty | XP | Coins |
|---|---|---|
| Easy | 20 XP | 5 coins |
| Medium | 50 XP | 15 coins |
| Hard | 100 XP | 30 coins |

Level thresholds scale progressively: Level 1 → 200 XP, Level 2 → 300 XP, Level 3 → 400 XP...

### 🐾 Virtual Pet
- Gains XP from every verified quest (half of quest XP)
- Feed it for 10 coins → +20 happiness
- Levels up with the child, sends celebration notifications

### 🏆 Achievements
| Badge | Condition |
|---|---|
| First Quest | Complete 1 quest |
| 100 XP Club | Earn 100 total XP |
| 500 XP Super Star | Earn 500 total XP |
| 7 Day Streak | 7-day consecutive streak |
| 15 Day Streak | 15-day consecutive streak |
| Reading Master | 3 reading quests verified |
| Homework Hero | 3 study quests verified |
| Healthy Kid | 5 health quests verified |
| 10 Completed Quests | 10 total verified quests |

### 🔥 Streaks
- Increments **once per calendar day** on quest verification
- Longest streak is tracked separately

---

## 🤖 AI Features (Powered by Gemini 2.0 Flash)

| Feature | Description |
|---|---|
| **Adventure Title Generator** | Converts "Brush Teeth" → "Defeat the Cavity Monster" |
| **Habit Planner** | Generates a full morning/evening/weekend routine from a description |
| **Motivation Messages** | Personalized encouragement for each child on their dashboard |
| **Parent Q&A Assistant** | Expert parenting advice with gamification tips |
| **Weekly Progress Reports** | AI analysis of habits, strengths, weaknesses & recommendations |

> All AI features gracefully fall back to curated defaults if no API key is provided.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register-parent` | Register a new parent |
| POST | `/api/auth/login-parent` | Parent login |
| POST | `/api/auth/login-child` | Child login |

### Parent (requires Bearer token)
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/parent/children` | List / add children |
| PUT/DELETE | `/api/parent/children/:id` | Edit / delete child |
| GET/POST | `/api/parent/quests` | List / create quests |
| PUT/DELETE | `/api/parent/quests/:id` | Edit / delete quest |
| POST | `/api/parent/quests/:id/verify` | Verify completed quest |
| POST | `/api/parent/quests/:id/reject` | Reject quest submission |
| POST | `/api/parent/rewards` | Create reward |
| POST | `/api/parent/rewards/:id/approve` | Approve reward redemption |
| POST | `/api/parent/rewards/:id/reject` | Reject reward (refunds coins) |
| GET | `/api/parent/dashboard` | Analytics overview |

### Child (requires Bearer token)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/children/:id/dashboard` | Full child state |
| POST | `/api/children/:childId/quests/:questId/submit` | Submit quest for verification |
| POST | `/api/children/:id/feed-pet` | Feed virtual pet (10 coins) |
| POST | `/api/children/:childId/rewards/:rewardId/claim` | Claim a reward |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/plan` | Generate habit plan |
| POST | `/api/ai/assistant` | Parent Q&A |
| POST | `/api/ai/report` | Generate weekly report |

---

## 📄 License

MIT © [Kedar Naygaonkar](https://github.com/Kedarnaygaonkar)
