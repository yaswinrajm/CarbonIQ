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
    } catch (error) {
      console.warn("Gemini API failed, returning mock roadmap data.");
      return {
        roadmap: [
          { month: "M1", action: "Switch to 100% renewable energy tariff for main office", saving_tonnes: 120, cost: "$$", difficulty: "Low" },
          { month: "M2", action: "Conduct energy efficiency audit of all facilities", saving_tonnes: 45, cost: "$", difficulty: "Low" },
          { month: "M3", action: "Upgrade HVAC systems to high-efficiency models", saving_tonnes: 85, cost: "$$$", difficulty: "Medium" },
          { month: "M4", action: "Implement hybrid work policy to reduce commuting", saving_tonnes: 60, cost: "Free", difficulty: "Medium" },
          { month: "M5", action: "Transition 25% of corporate fleet to EVs", saving_tonnes: 150, cost: "$$$", difficulty: "High" },
          { month: "M6", action: "Engage top 10 suppliers on carbon reduction targets", saving_tonnes: 300, cost: "$", difficulty: "High" }
        ],
        top3_recommendations: [
          { title: "Renewable Energy Transition", description: "Immediate shift to green tariffs across all sites.", saving_tonnes: 120, cost_saving: "$5k/yr" },
          { title: "Fleet Electrification", description: "Begin phasing out combustion engine vehicles.", saving_tonnes: 150, cost_saving: "$12k/yr" },
          { title: "Supplier Engagement", description: "Tackle Scope 3 by working with key vendors.", saving_tonnes: 300, cost_saving: "$0" }
        ],
        industry_benchmark_analysis: "Your emissions profile aligns closely with industry medians. However, there is significant opportunity to reduce Scope 2 emissions through immediate renewable energy procurement.",
        risk_score: "Medium",
        risk_explanation: "Upcoming regulatory changes in your jurisdiction may introduce carbon pricing, creating moderate financial exposure if current trajectories continue."
      };
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
      console.warn("Gemini API failed, returning mock extracted data.");
      return {
        electricityKwh: 45000,
        gasM3: 1200,
        flightHours: 200,
        carKm: 85000,
        commutingKmPerDay: 0,
        landfillKg: 9600,
        recycledKg: 4800,
        waterLiters: 0
      };
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
      console.warn("Gemini API failed, returning mock supply chain analysis.");
      return `1. IT Equipment & Software: Enforce strict EPEAT Gold and Energy Star 8.0 procurement standards for all new hardware purchases globally. Require major IT vendors to provide product carbon footprint (PCF) data before contract renewal. Estimated reduction: 15% within 12 months.

2. Business Travel & Hotels: Implement a 'Rail First' policy for journeys under 400 miles and mandate bookings with hotel chains demonstrating SBTI-aligned net-zero commitments. Use travel management software to surface carbon budgets at the point of booking. Estimated reduction: 25% within 6 months.

3. Logistics & Freight: Transition 20% of last-mile delivery to electric vehicles or cargo bikes in urban areas by partnering with specialized green logistics providers. Consolidate shipments to reduce overall trip volume. Estimated reduction: 12% within 18 months.`;
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
      console.warn("Gemini API failed, returning mock chat response.");
      return "I'm currently operating in Mock Mode as the AI service is unavailable. However, looking at your data, addressing your Scope 3 emissions (which are typically 70% of a company's footprint) should be your primary focus right now. Let me know if you'd like to explore supplier engagement strategies!";
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
      console.warn("Gemini API failed, returning mock competitor data.");
      return competitorNames.map((name, index) => {
        const base = 80000 + (Math.random() * 50000 * (index % 2 === 0 ? 1 : -1));
        return {
          companyName: name,
          employeeCount: 45000 + Math.floor(Math.random() * 20000),
          scope1Tonnes: base * 0.1,
          scope2Tonnes: base * 0.2,
          scope3Tonnes: base * 0.7,
          totalTonnes: base,
          reportingYear: "2023",
          reductionTarget: "Net Zero by 2040",
          carbonNeutralBy: "2040",
          esgRating: ["AA", "A", "BBB"][Math.floor(Math.random() * 3)],
          topInitiatives: ["Renewable Energy PPA", "Fleet Electrification", "Supplier Code of Conduct"],
          dataConfidence: "Medium",
          dataSource: "Mock CDP Disclosure Database"
        };
      });
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
      console.warn("Gemini API failed, returning mock competitive report.");
      return `Competitive Intelligence Executive Summary

Leader Analysis
Based on the current emissions trajectory and ESG ratings, the sector leader has successfully decoupled revenue growth from absolute emissions growth primarily through aggressive Scope 2 renewable energy procurement and stringent Scope 3 supplier criteria.

Your Competitive Advantages
• Data Transparency: Your internal data resolution is exceptionally high, building foundational trust.
• Operational Efficiency: Your Scope 1 and 2 emissions per employee are highly competitive against the peer median.

Vulnerabilities
• Supply Chain Exposure: Competitors are moving faster to mandate carbon reporting from their tier 1 suppliers, leaving your organization exposed to emerging Scope 3 regulations.
• Ambition Gap: Several peers have committed to specific Net Zero dates, whereas your public targets remain relatively conservative.

Priority Corrective Actions
1. Publish a science-based Net Zero target date.
2. Implement a supplier carbon-reporting mandate.
3. Accelerate global facility transitions to 100% renewable energy tariffs.

Emerging Industry Trends
The sector is rapidly shifting from voluntary disclosure to mandatory compliance, with leaders aggressively adopting internal carbon pricing models to drive business unit accountability.`;
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
      console.warn("Gemini API failed, returning mock snapshot.");
      return {
        companyName: companyName,
        industry: "Technology",
        employeeCount: 5200,
        country: "United States",
        scope1Tonnes: 12000,
        scope2Tonnes: 45000,
        scope3Tonnes: 180000,
        totalTonnes: 237000,
        carbonScore: "B",
        carbonScoreNumeric: 74,
        biggestSource: "Purchased Goods & Services",
        regulatoryRisk: "Medium",
        applicableRegulations: ["California SB 253", "SEC Climate Disclosure"],
        estimatedCarbonTaxLiability: 4500000,
        topCompetitors: ["Competitor A", "Competitor B", "Competitor C"],
        vsIndustryAverage: "8% below average",
        singleBiggestAction: "Accelerate the transition of primary data centers to 100% clean energy PPAs.",
        dataConfidence: "Medium",
        dataSource: "Mock Public Estimates"
      };
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
      console.warn("Gemini API failed, returning mock recognition.");
      const isKnownMock = companyName.toLowerCase().length > 5; // Fake logic: long names are known
      return {
        isKnown: isKnownMock,
        confidence: isKnownMock ? "High" : "Low",
        companyFullName: companyName,
        industry: "Technology",
        country: "United States",
        approximateEmployees: isKnownMock ? 10000 : 50,
        reason: isKnownMock ? "Mock data: Company recognized." : "Mock data: Unknown company."
      };
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
      console.warn("Gemini API failed, returning mock industry estimate.");
      return {
        estimatedIndustry: "Software & IT Services",
        employeeRangeGuess: "50-200",
        lowEstimateTonnes: 250,
        highEstimateTonnes: 1800,
        typicalBiggestSource: "Purchased Cloud Services (Scope 3) & Electricity",
        typicalRegulatoryRisk: "Low"
      };
    }
  });
}

