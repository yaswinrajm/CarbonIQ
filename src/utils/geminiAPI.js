import { GoogleGenerativeAI } from "@google/generative-ai";
import { trackAI } from "./carbonOfAI";

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
  return trackAI("Roadmap Generation", async () => {
    try {
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
    "roadmap": "Generate a 12-month carbon reduction roadmap. Return ONLY a valid JSON array with exactly 12 objects. Each object must have these exact keys: monthNumber (integer 1-12), monthName (string like January), actionTitle (string, max 8 words), actionDescription (string, 1-2 sentences), savingTonnes (number, not string), costUSD (number, not string), difficulty (exactly one of: Easy, Medium, Hard), responsibleArea (string like Operations or IT or Facilities). Do not include any text before or after the JSON array.",
    "top3_recommendations": [array of 3 objects with title, description, savingTonnes (number), costSavingUSD (number)],
    "industry_benchmark_analysis": "2-3 sentence analysis",
    "risk_score": "High or Medium or Low",
    "risk_explanation": "1-2 sentence explanation"
  }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

export async function extractDataFromText(text) {
  return trackAI("Data Extraction", async () => {
    try {
      const model = ensureModel();
      const systemPrompt = `You are a carbon data extraction specialist. Extract all numerical emissions-related values from the text and return ONLY valid JSON with these exact keys: electricityKwh (annual), gasM3 (annual), flightHours (annual), carKm (annual), commutingKmPerDay, landfillKg (annual), recycledKg (annual), waterLiters (annual). Convert any monthly values to annual by multiplying by 12. Set missing values to 0. Return only the JSON object, no explanation.`;

      const result = await model.generateContent(`${systemPrompt}\n\nUser text:\n${text}`);
      const raw = result.response.text();
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

export async function analyzeSupplyChain(spendRows, companyInfo) {
  return trackAI("Supply Chain Analysis", async () => {
    try {
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
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

export async function chatWithData(messages, emissionsData, companyInfo) {
  return trackAI("Chat Message", async () => {
    try {
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
      const result = await chat.sendMessage(`${systemContext}\n\nUser: ${last.content}`);
      return result.response.text();
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

export async function analyzeCompetitors(competitorNames) {
  return trackAI("Competitor Intelligence", async () => {
    try {
      const model = ensureModel();
      const prompt = `You are a sustainability research analyst. For each of these companies: ${competitorNames.join(", ")}, search your knowledge for the most recent publicly available carbon emissions data from sustainability reports, CDP disclosures, or ESG filings. For each company return data in this exact JSON array format: [{"companyName": "string", "employeeCount": number, "scope1Tonnes": number, "scope2Tonnes": number, "scope3Tonnes": number, "totalTonnes": number, "reportingYear": "string", "reductionTarget": "string", "carbonNeutralBy": "string (year)", "esgRating": "string (e.g. AA, B+)", "topInitiatives": ["string", "string", "string"], "dataConfidence": "High, Medium, or Low", "dataSource": "string"}]. If exact data is unavailable provide a reasonable estimate based on company size and industry and set dataConfidence to "Low". Always return valid JSON array only.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

export async function generateCompetitiveReport(companyData, competitorData, industry) {
  return trackAI("Competitive Report", async () => {
    try {
      const model = ensureModel();
      const dataDump = JSON.stringify({ myCompany: companyData, competitors: competitorData }, null, 2);

      const prompt = `You are a highly strategic ESG competitive intelligence analyst. Analyze this carbon footprint data comparing my company to competitors in the ${industry} industry:
${dataDump}

Provide a comprehensive, executive-level text report covering:
1. Who is the sustainability leader and specifically why?
2. Where does my company have a clear competitive advantage?
3. Where is my company most vulnerable versus competitors?
4. Three specific actions ranked by competitive impact to improve our position.
5. Emerging trends based on competitor commitments.

Format the response with bold section headings, normal body text, and bullet points where appropriate. Keep it professional, data-driven, and actionable. Do NOT use markdown code blocks bounding the text.`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

export async function getInstantSnapshot(companyName) {
  return trackAI("Instant Snapshot", async () => {
    try {
      const model = ensureModel();
      const prompt = `You are a carbon accounting expert. Based on your knowledge of publicly available sustainability reports, CDP disclosures, industry averages, and ESG data, generate a carbon footprint snapshot for ${companyName}. If you know specific data about this company use it. If not, generate a realistic estimate based on their industry, approximate size, and country of operation. Return ONLY valid JSON: {"companyName": "string", "industry": "string", "employeeCount": number, "country": "string", "scope1Tonnes": number, "scope2Tonnes": number, "scope3Tonnes": number, "totalTonnes": number, "carbonScore": "letter A to F", "carbonScoreNumeric": number_0_to_100, "biggestSource": "string", "regulatoryRisk": "High or Medium or Low", "applicableRegulations": ["string"], "estimatedCarbonTaxLiability": number_in_USD, "topCompetitors": ["string","string","string"], "vsIndustryAverage": "string like 23% above average", "singleBiggestAction": "one sentence string", "dataConfidence": "High or Medium or Low", "dataSource": "string"}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

export async function checkCompanyRecognition(companyName) {
  return trackAI("Company Recognition", async () => {
    try {
      const model = ensureModel();
      const prompt = `Is ${companyName} a well-known publicly listed company with available sustainability or ESG data? Reply with only valid JSON: {"isKnown": boolean, "confidence": "High, Medium, or Low", "companyFullName": "string", "industry": "string", "country": "string", "approximateEmployees": number, "reason": "string"}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

export async function getIndustryEstimate(companyName) {
  return trackAI("Industry Estimate", async () => {
    try {
      const model = ensureModel();
      const prompt = `Based on the company name ${companyName} estimate their industry and generate a carbon footprint range estimate for a typical company in that industry. Return ONLY valid JSON: {"estimatedIndustry": "string", "employeeRangeGuess": "string", "lowEstimateTonnes": number, "highEstimateTonnes": number, "typicalBiggestSource": "string", "typicalRegulatoryRisk": "High, Medium, or Low"}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch (error) {
      console.error("Gemini API failed:", error);
      throw error;
    }
  });
}

