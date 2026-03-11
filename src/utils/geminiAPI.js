import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

let genAI = null;
if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize GoogleGenerativeAI", e);
  }
}

function ensureModel() {
  if (!genAI) {
    throw new Error(
      "Gemini API key is missing or invalid. Please set REACT_APP_GEMINI_API_KEY in your .env file and restart the dev server."
    );
  }
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
}

export async function analyzeEmissions(emissionsData, companyInfo) {
  const model = ensureModel();

  const prompt = `You are a sustainability consultant analyzing carbon footprint data for ${companyInfo.name || "an organization"}, a ${companyInfo.industry} company with ${companyInfo.employees} employees in ${companyInfo.country}.
  
Emissions Data:
- Total CO2e: ${emissionsData.totalTonnes?.toFixed?.(2) ?? emissionsData.total} tonnes
- Scope 1: ${emissionsData.scope1} tonnes  
- Scope 2: ${emissionsData.scope2} tonnes
- Scope 3: ${emissionsData.scope3} tonnes
- Industry average: ${emissionsData.industryAverage} tonnes

Respond ONLY with valid JSON in this exact format:
{
  "roadmap": [array of 6 monthly actions with month, action, saving_tonnes, cost, difficulty],
  "top3_recommendations": [array of 3 objects with title, description, saving_tonnes, cost_saving],
  "industry_benchmark_analysis": "2-3 sentence analysis",
  "risk_score": "High or Medium or Low",
  "risk_explanation": "1-2 sentence explanation"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function extractDataFromText(text) {
  const model = ensureModel();

  const systemPrompt = `You are a carbon data extraction specialist. Extract all numerical emissions-related values from the text and return ONLY valid JSON with these exact keys: electricityKwh (annual), gasM3 (annual), flightHours (annual), carKm (annual), commutingKmPerDay, landfillKg (annual), recycledKg (annual), waterLiters (annual). Convert any monthly values to annual by multiplying by 12. Set missing values to 0. Return only the JSON object, no explanation.`;

  const result = await model.generateContent(
    `${systemPrompt}\n\nUser text:\n${text}`
  );
  const raw = result.response.text();
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function analyzeSupplyChain(spendRows, companyInfo) {
  const model = ensureModel();

  const breakdown = spendRows
    .filter((r) => r.spend > 0)
    .map((r) => `- ${r.category}: $${r.spend.toLocaleString()} spend → ${r.co2e.toFixed(2)} t CO₂e`)
    .join("\n");

  const prompt = `You are a Scope 3 supply chain decarbonization specialist advising ${companyInfo.name || "a company"} in the ${companyInfo.industry} sector.

Their supply chain spend-based emissions breakdown:
${breakdown}

Based on the highest-emission categories, provide exactly 3 specific, actionable supplier engagement recommendations. For each recommendation include: the category it targets, a concrete action, the estimated emissions reduction potential (as a percentage), and the implementation timeline. Be specific with supplier names, certification standards, or technologies where possible. Keep each recommendation to 2-3 sentences.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function chatWithData(messages, emissionsData, companyInfo) {
  const model = ensureModel();

  const systemContext = `You are CarbonIQ, a sustainability AI assistant for ${companyInfo.name || "this organization"}. 
Their total emissions are ${emissionsData.totalTonnes ?? emissionsData.total} tonnes CO2e. 
Scope 1: ${emissionsData.scope1}t, Scope 2: ${emissionsData.scope2}t, Scope 3: ${emissionsData.scope3}t.
Industry: ${companyInfo.industry}. Employees: ${companyInfo.employees}. Country: ${companyInfo.country}.
Be specific, data-driven, and actionable. Keep responses concise and helpful.`;

  const chat = model.startChat({
    history: messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
  });

  const last = messages[messages.length - 1];
  const result = await chat.sendMessage(
    `${systemContext}\n\nUser: ${last.content}`
  );
  return result.response.text();
}

