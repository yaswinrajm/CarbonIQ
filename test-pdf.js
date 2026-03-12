import fs from 'fs';

// Mock browser objects so jspdf and the script can run
global.window = {};
global.document = {
  createElement: () => ({}),
};
global.navigator = { userAgent: "node" };

// Mock Image
global.Image = class {
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 10);
  }
};

// We will dynamically import the pdfGenerator to avoid early failures
async function run() {
  const { generateCarbonReportPDF } = await import('./src/utils/pdfGenerator.js');

  const company = { name: "TestCo", industry: "Tech", country: "US", year: 2026 };
  const emissions = {
    totalTonnes: 100,
    perEmployee: 5,
    carbonScore: 80,
    grade: "B",
    biggestSource: "Electricity",
    scope1: 10,
    scope2: 40,
    scope3: 50
  };

  const aiInsights = {
    top3_recommendations: [
      { title: "Solar", description: "Use solar", saving_tonnes: "20", cost_saving: "1000" }
    ],
    industry_benchmark_analysis: "You are doing okay.",
    risk_score: "Low",
    risk_explanation: "Low risk.",
    roadmap: [
      { month: 1, action: "Do this", savingTonnes: 10, costUSD: 500, difficulty: "Easy" }
    ]
  };

  try {
    console.log("Generating PDF...");
    await generateCarbonReportPDF(company, emissions, aiInsights);
    console.log("PDF generated successfully.");
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
}

run();
