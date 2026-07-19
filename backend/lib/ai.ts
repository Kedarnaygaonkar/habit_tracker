import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key-for-now", // Fallback to avoid crash if env is missing
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const MODEL_NAME = "gemini-1.5-flash";

// Check if API key exists. If not, we can return dummy values or mock responses.
function hasApiKey(): boolean {
  return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && process.env.GEMINI_API_KEY !== "";
}

/**
 * AI Story Generator: Converts a standard habit name into a fun, gamified adventure title
 */
export async function generateAdventureTitle(habitName: string): Promise<string> {
  if (!hasApiKey()) {
    // Elegant fallback if no API key is present
    const fallbacks: { [key: string]: string } = {
      "Brush Teeth": "Defeat the Cavity Monster",
      "Read Book": "Discover the Lost Library",
      "Do Homework": "Complete the Wizard Academy Challenge",
      "Exercise": "Train to Become a Dragon Rider",
      "Drink Water": "Drink the Magic Potion",
      "Clean Room": "Organize the Kingdom of Chaos",
      "Eat Vegetables": "Eat the Power Greens of Vitality",
    };
    return fallbacks[habitName] || `Quest: ${habitName}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Convert this daily habit or chore into a highly engaging, gamified adventure title for a child. 
Habit Name: "${habitName}"

Examples:
- Brush Teeth -> Defeat the Cavity Monster
- Read Book -> Discover the Lost Library
- Do Homework -> Complete the Wizard Academy Challenge

Respond ONLY with the adventure title, nothing else. No explanation, no quotes.`,
    });

    return response.text?.trim() || `Quest: ${habitName}`;
  } catch (e) {
    console.error("AI Story Generator failed, using fallback:", e);
    return `Quest: ${habitName}`;
  }
}

/**
 * AI Habit Planner: Generates daily routine plans for a child based on parents' descriptions
 */
export async function generateHabitPlan(description: string) {
  if (!hasApiKey()) {
    // Beautiful default fallback for development
    return {
      morningRoutine: ["Brush teeth & wash face (Defeat the Cavity Monster)", "Make your bed (Reclaim the Sleeping Sanctuary)", "Pack school bag (Assemble the Adventurer Backpack)"],
      eveningRoutine: ["Finish homework (Complete the Wizard Academy Challenge)", "Set up clothes for tomorrow (Prepare the Armor of Tomorrow)", "Read for 20 mins (Discover the Lost Library)"],
      weekendRoutine: ["Help clean the house (Organize the Kingdom of Chaos)", "Go for a nature walk (Map the Uncharted Forest)"],
      readingGoals: "Read 15-20 minutes daily, starting with highly visual adventure stories or graphic novels.",
      exerciseGoals: "Active play or sports for at least 30 minutes daily to build ninja agility.",
      sleepSchedule: "Wind-down routine starting at 8:00 PM, lights out by 8:30 PM."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are an expert child development specialist and parent coach. 
Generate a comprehensive habit schedule based on this parent request: "${description}".

Return the plan in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            morningRoutine: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Morning quests with gamified titles"
            },
            eveningRoutine: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Evening quests with gamified titles"
            },
            weekendRoutine: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Weekend quests with gamified titles"
            },
            readingGoals: {
              type: Type.STRING,
              description: "Age-appropriate reading recommendations and goals"
            },
            exerciseGoals: {
              type: Type.STRING,
              description: "Actionable physical activity goals"
            },
            sleepSchedule: {
              type: Type.STRING,
              description: "Recommended sleep schedule and bedtime routine"
            }
          },
          required: ["morningRoutine", "eveningRoutine", "weekendRoutine", "readingGoals", "exerciseGoals", "sleepSchedule"]
        }
      }
    });

    const text = response.text?.trim() || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.error("AI Habit Planner failed, returning fallback:", e);
    return {
      morningRoutine: ["Brush teeth & wash face", "Make bed", "Do some light stretching"],
      eveningRoutine: ["Finish homework", "Pack backpack", "Read for 20 minutes"],
      weekendRoutine: ["Organize study desk", "Do 30 mins of outdoor activity"],
      readingGoals: "Encourage reading for 15 minutes everyday",
      exerciseGoals: "At least 30 minutes of physical activity daily",
      sleepSchedule: "Maintain a stable 8 hours sleep cycle starting around 9:00 PM"
    };
  }
}

/**
 * AI Motivation: Generates custom encouraging message for a child based on achievements
 */
export async function generateMotivation(childName: string, recentHistory: string): Promise<string> {
  if (!hasApiKey()) {
    return `Incredible job, ${childName}! You've been completing your quests like a real hero. Keep it up to level up your pet and claim awesome rewards!`;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Write a short, direct, highly encouraging message for a child named "${childName}" who has been tracking their habits on our app. 
Recent activity context: ${recentHistory}

Guidelines:
- Tone: Extremely positive, magical, child-friendly (like a game guide or kind wizard).
- Keep it under 2 sentences.
- Mention their pet or reward shop motivation.
- NEVER use generic boring text. Make it feel alive and personalized.`,
    });

    return response.text?.trim() || `Amazing job, ${childName}! You are doing awesome!`;
  } catch (e) {
    return `Fantastic effort, ${childName}! Your virtual pet is so proud of you!`;
  }
}

/**
 * AI Parent Assistant Q&A
 */
export async function generateParentAdvice(question: string): Promise<string> {
  if (!hasApiKey()) {
    return `**Scientific Recommendation:**
1. **Clear Milestones:** Break complex tasks into bite-sized steps (e.g., "organize desk" instead of "clean room").
2. **Positive Reinforcement:** Focus on praising the *effort* rather than the outcome. Let them see their coins grow in HabitQuest!
3. **Consistency:** Set predictable, simple schedules. Encourage your child to complete quests at the same time every day.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are an expert parenting psychologist and child behavior consultant.
The parent asks: "${question}"

Provide a highly actionable, scientifically-supported, and encouraging recommendation in markdown format. 
Focus on:
- Empathizing with the parent's challenge.
- 3 clear, practical parenting tips.
- How they can use gamified reward mechanics (XP, Coins, virtual pets) to solve this challenge.
Keep it direct, warm, and professional. No fluff.`,
    });

    return response.text || "I apologize, I'm unable to answer right now. Please try again soon!";
  } catch (e) {
    console.error("AI Parent Assistant failed:", e);
    return "Failed to get AI recommendation. Please check your network connection and try again.";
  }
}

/**
 * AI Weekly Report Generator
 */
export async function generateWeeklyReport(childName: string, questsCompleted: number, totalQuests: number, streak: number) {
  const completionRate = totalQuests > 0 ? Math.round((questsCompleted / totalQuests) * 100) : 0;
  const habitScore = Math.min(100, Math.max(20, completionRate + streak * 2));

  if (!hasApiKey()) {
    return {
      habitScore,
      completionRate,
      strengths: [`Excellent persistence with a streak of ${streak} days`, `${childName} is highly consistent with morning quests`],
      weaknesses: ["Bedtime routines are occasionally missed", "Completing tasks without parents requiring multiple reminders"],
      recommendations: ["Set a bedtime quest 30 minutes earlier", "Convert difficult tasks into team adventures with parents"],
      bestTimeOfDay: "Morning",
      parentSummary: `${childName} has made incredible progress this week! With an overall habit consistency score of ${habitScore}%, they are showing real growth, particularly in brushing teeth and reading. Keep reinforcing their awesome streak!`
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate a comprehensive child progress report.
Child Name: "${childName}"
Quests Completed: ${questsCompleted} out of ${totalQuests} total quests
Current Daily Streak: ${streak} days

Return a JSON report object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            habitScore: { type: Type.INTEGER, description: "A calculated overall habit score out of 100" },
            completionRate: { type: Type.INTEGER, description: "Completion percentage" },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            bestTimeOfDay: { type: Type.STRING, description: "Best performing time (e.g., Morning, Afternoon, Evening)" },
            parentSummary: { type: Type.STRING, description: "A detailed 2-3 sentence overview of the child's behavioral growth and tips" }
          },
          required: ["habitScore", "completionRate", "strengths", "weaknesses", "recommendations", "bestTimeOfDay", "parentSummary"]
        }
      }
    });

    const text = response.text?.trim() || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.error("AI Report generation failed, returning fallback:", e);
    return {
      habitScore,
      completionRate,
      strengths: [`Good consistency maintaining a streak of ${streak} days`],
      weaknesses: ["Some evening quests are occasionally missed"],
      recommendations: ["Encourage consistency with simple daily reminders"],
      bestTimeOfDay: "Morning",
      parentSummary: `${childName} is doing very well overall, with a consistency score of ${habitScore}%. Keep praising their efforts!`
    };
  }
}
