// AI Migration to Hugging Face DeepSeek-V4-Flash

const HF_API_KEY = process.env.HF_API_KEY || "";
const HF_MODEL = "deepseek-ai/DeepSeek-V4-Flash";

function hasApiKey(): boolean {
  return !!HF_API_KEY;
}

async function fetchHF(systemPrompt: string, userPrompt: string, jsonMode: boolean = false) {
  try {
    // Attempt OpenAI compatible endpoint first
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;
      return content;
    }
    
    // Fallback to standard HF inference API if v1/chat fails
    const fallbackResponse = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: systemPrompt + "\n" + userPrompt,
        parameters: { max_new_tokens: 1000, temperature: 0.7 }
      })
    });
    
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      return data[0].generated_text.replace(systemPrompt + "\n" + userPrompt, "").trim();
    }
    
    throw new Error("Both HF API endpoints failed.");
  } catch (e) {
    throw e;
  }
}

/**
 * AI Story Generator: Converts a standard habit name into a fun, gamified adventure title
 */
export async function generateAdventureTitle(habitName: string): Promise<string> {
  const fallbacks: { [key: string]: string } = {
    "Brush Teeth": "Defeat the Cavity Monster",
    "Read Book": "Discover the Lost Library",
    "Do Homework": "Complete the Wizard Academy Challenge",
    "Exercise": "Train to Become a Dragon Rider",
    "Drink Water": "Drink the Magic Potion",
    "Clean Room": "Organize the Kingdom of Chaos",
    "Eat Vegetables": "Eat the Power Greens of Vitality",
  };
  
  try {
    const sys = "You are a creative writer. Respond ONLY with the adventure title, nothing else. No explanation, no quotes.";
    const usr = `Convert this daily habit or chore into a highly engaging, gamified adventure title for a child.\nHabit Name: "${habitName}"\nExamples:\n- Brush Teeth -> Defeat the Cavity Monster\n- Read Book -> Discover the Lost Library\n- Do Homework -> Complete the Wizard Academy Challenge`;
    const res = await fetchHF(sys, usr);
    return res.trim() || fallbacks[habitName] || `Quest: ${habitName}`;
  } catch (e) {
    console.error("AI Story Generator failed, using fallback:", e);
    return fallbacks[habitName] || `Quest: ${habitName}`;
  }
}

/**
 * AI Habit Planner: Generates daily routine plans for a child based on parents' descriptions
 */
export async function generateHabitPlan(description: string) {
  try {
    const sys = `You are an expert child development specialist and parent coach. Generate a JSON response only.`;
    const usr = `Generate a comprehensive habit schedule based on this parent request: "${description}".
Return exactly this JSON format:
{
  "morningRoutine": ["quest 1", "quest 2"],
  "eveningRoutine": ["quest 1"],
  "weekendRoutine": ["quest 1"],
  "readingGoals": "string",
  "exerciseGoals": "string",
  "sleepSchedule": "string"
}`;
    
    let res = await fetchHF(sys, usr, true);
    
    // Clean up potential markdown formatting around JSON
    res = res.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(res);
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
  try {
    const sys = "You are a highly positive game guide or kind wizard talking to a child. Keep it under 2 sentences. Mention their pet or reward shop motivation.";
    const usr = `Write a short, direct, highly encouraging message for a child named "${childName}" who has been tracking their habits. Recent activity context: ${recentHistory}`;
    const res = await fetchHF(sys, usr);
    return res.trim();
  } catch (e) {
    return `Fantastic effort, ${childName}! Your virtual pet is so proud of you!`;
  }
}

/**
 * AI Parent Assistant Q&A
 */
export async function generateParentAdvice(question: string): Promise<string> {
  try {
    const sys = "You are an expert parenting psychologist and child behavior consultant. Provide a highly actionable, scientifically-supported, and encouraging recommendation in markdown format. Focus on 3 practical tips and gamified mechanics. Keep it direct and professional.";
    const usr = `The parent asks: "${question}"`;
    const res = await fetchHF(sys, usr);
    return res.trim();
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

  try {
    const sys = "You are an AI generating a JSON report. Return exactly the requested JSON format.";
    const usr = `Generate a comprehensive child progress report.
Child Name: "${childName}"
Quests Completed: ${questsCompleted} out of ${totalQuests} total quests
Current Daily Streak: ${streak} days
Overall Score: ${habitScore}
Completion Rate: ${completionRate}

Return exactly this JSON format:
{
  "habitScore": ${habitScore},
  "completionRate": ${completionRate},
  "strengths": ["string", "string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "bestTimeOfDay": "Morning",
  "parentSummary": "2-3 sentence overview"
}`;
    
    let res = await fetchHF(sys, usr, true);
    res = res.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(res);
  } catch (e) {
    console.error("AI Report generation failed, returning fallback:", e);
    return {
      habitScore,
      completionRate,
      strengths: [`Good consistency maintaining a streak of ${streak} days`],
      weaknesses: ["Some evening quests are occasionally missed"],
      recommendations: ["Encourage consistency with simple daily reminders"],
      bestTimeOfDay: "Morning",
      parentSummary: `${childName} has made steady progress this week. Let's keep the streak going!`
    };
  }
}
