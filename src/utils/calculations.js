const EMPLOYEE_BUCKET_MIDPOINT = {
  "1-50": 25,
  "51-200": 120,
  "201-500": 350,
  "501-2000": 1000,
  "2000+": 2500,
};

const INDUSTRY_BENCHMARKS = {
  Technology: 8,
  Manufacturing: 25,
  Retail: 15,
  Healthcare: 18,
  Finance: 6,
  Education: 10,
  Logistics: 30,
  Other: 12,
};

export function normalizeEmployees(employees) {
  if (typeof employees === "number") return employees;
  if (EMPLOYEE_BUCKET_MIDPOINT[employees]) return EMPLOYEE_BUCKET_MIDPOINT[employees];
  const parsed = parseInt(employees, 10);
  return Number.isNaN(parsed) ? 100 : parsed;
}

export function getIndustryAveragePerEmployee(industry) {
  return INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.Other;
}

export function calculateEmissions(input, company) {
  const employeesCount = normalizeEmployees(company?.employees || "100");

  const {
    electricityKwh = 0,
    naturalGasM3 = 0,
    renewablePercent = 0,
    officeLocations = 1,
    flightsHours = 0,
    fleetKm = 0,
    commuteKmPerDay = 0,
    workingDays = 220,
    publicTransitPercent = 0,
    landfillKg = 0,
    recycledKg = 0,
    waterLiters = 0,
    revenuePer1000 = 0,
  } = input || {};

  const scope1NaturalGas = naturalGasM3 * 2.04;
  const scope1Vehicles = fleetKm * 0.171;
  const scope1 = scope1NaturalGas + scope1Vehicles;

  const effectiveKwh = electricityKwh * (1 - renewablePercent / 100);
  const scope2Electricity = effectiveKwh * 0.233;
  const scope2 = scope2Electricity;

  const scope3Flights = flightsHours * 255;
  const commuteKmYear = commuteKmPerDay * workingDays * employeesCount;
  const scope3Commute = commuteKmYear * 0.171 * (1 - publicTransitPercent / 100);
  const scope3Waste = landfillKg * 0.58;
  const scope3Water = waterLiters * 0.000344;
  const scope3 = scope3Flights + scope3Commute + scope3Waste + scope3Water;

  const totalKg = scope1 + scope2 + scope3;
  const totalTonnes = totalKg / 1000;

  const perEmployee = employeesCount > 0 ? totalTonnes / employeesCount : 0;
  const industryAvgPerEmployee = getIndustryAveragePerEmployee(company?.industry || "Other");

  const carbonScoreRaw = 100 - (perEmployee / industryAvgPerEmployee) * 50;
  const carbonScore = Math.min(100, Math.max(0, Number.isFinite(carbonScoreRaw) ? carbonScoreRaw : 0));

  let grade = "F";
  if (carbonScore >= 81) grade = "A";
  else if (carbonScore >= 66) grade = "B";
  else if (carbonScore >= 51) grade = "C";
  else if (carbonScore >= 31) grade = "D";
  else grade = "F";

  const categoryEnergy = scope2 + scope1NaturalGas;
  const categoryTransport = scope1Vehicles + scope3Flights + scope3Commute;
  const categoryWaste = scope3Waste;
  const categoryWater = scope3Water;

  const categories = {
    Energy: categoryEnergy,
    Transport: categoryTransport,
    Waste: categoryWaste,
    Water: categoryWater,
  };

  let biggestSource = null;
  let biggestValue = 0;
  Object.entries(categories).forEach(([key, value]) => {
    if (value > biggestValue) {
      biggestValue = value;
      biggestSource = key;
    }
  });

  const carbonPricePerTonne = 50;
  const projectedAnnualCost = totalTonnes * carbonPricePerTonne;

  const carbonIntensity = revenuePer1000 > 0 ? totalKg / revenuePer1000 : 0;

  return {
    scope1: scope1 / 1000,
    scope2: scope2 / 1000,
    scope3: scope3 / 1000,
    totalTonnes,
    perEmployee,
    industryAverage: industryAvgPerEmployee * employeesCount,
    industryAveragePerEmployee: industryAvgPerEmployee,
    carbonScore,
    grade,
    biggestSource,
    projectedAnnualCost,
    carbonIntensity,
    byCategory: {
      energy: categoryEnergy / 1000,
      transport: categoryTransport / 1000,
      waste: categoryWaste / 1000,
      water: categoryWater / 1000,
    },
  };
}

export function applyWhatIfAdjustments(baseRawInput, adjustments, company) {
  const {
    electricityReduction = 0,
    renewableIncrease = 0,
    flightsReduction = 0,
    wasteRecyclingIncrease = 0,
  } = adjustments;

  const adjusted = { ...baseRawInput };

  adjusted.electricityKwh =
    baseRawInput.electricityKwh * (1 - electricityReduction / 100);

  adjusted.renewablePercent = Math.min(
    100,
    (baseRawInput.renewablePercent || 0) + renewableIncrease
  );

  adjusted.flightsHours =
    baseRawInput.flightsHours * (1 - flightsReduction / 100);

  const extraRecycled =
    (baseRawInput.landfillKg || 0) * (wasteRecyclingIncrease / 100);

  adjusted.landfillKg = Math.max(0, (baseRawInput.landfillKg || 0) - extraRecycled);
  adjusted.recycledKg = (baseRawInput.recycledKg || 0) + extraRecycled;

  return calculateEmissions(adjusted, company);
}

