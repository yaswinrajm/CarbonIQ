import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../context";
import { applyWhatIfAdjustments } from "../utils/calculations";
import CarbonScoreGauge from "./CarbonScoreGauge";

/* 
  Calculates the grade letter and color based on the score
*/
function getGradeDetails(score) {
  if (score >= 81) return { grade: "A", color: "#22C55E" };
  if (score >= 66) return { grade: "B", color: "#84CC16" };
  if (score >= 51) return { grade: "C", color: "#F59E0B" };
  if (score >= 31) return { grade: "D", color: "#F97316" };
  return { grade: "F", color: "#EF4444" };
}

export function WhatIfSimulator() {
  const { rawInput, company, emissions } = useAppContext();
  const [sliders, setSliders] = useState({
    electricityReduction: 0,
    renewableIncrease: 0,
    flightsReduction: 0,
    wasteRecyclingIncrease: 0,
  });

  const handleChange = (key) => (e) => {
    const value = Number(e.target.value) || 0;
    setSliders((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSliders({
      electricityReduction: 0,
      renewableIncrease: 0,
      flightsReduction: 0,
      wasteRecyclingIncrease: 0,
    });
  };

  const adjusted = useMemo(() => {
    try {
      // Basic fallback if rawInput doesn't have the fields (e.g. mocked data)
      // We will adjust based on total scopes if rawInput is missing specific values.
      let baseTotal = emissions.totalTonnes || 0;
      let s2 = emissions.scope2 || (baseTotal * 0.3); // fallback 30% scope 2
      let s3 = emissions.scope3 || (baseTotal * 0.5); // fallback 50% scope 3
      
      // Calculate reductions
      let s2Reduction = s2 * (sliders.electricityReduction / 100);
      let renewableReduction = (s2 - s2Reduction) * (sliders.renewableIncrease / 100);
      
      // Assuming flights are 30% of scope 3, waste is 20% of scope 3
      let flightReduction = (s3 * 0.3) * (sliders.flightsReduction / 100);
      let wasteReduction = (s3 * 0.2) * (sliders.wasteRecyclingIncrease / 100);
      
      let tonnesSaved = s2Reduction + renewableReduction + flightReduction + wasteReduction;
      let newTotal = Math.max(0, baseTotal - tonnesSaved);
      
      // Recalculate score exactly per instructions
      let employeesCount = 100;
      if (company?.employees) {
        let e = company.employees;
        if (typeof e === "number") employeesCount = e;
        else {
          let map = { "1-50": 25, "51-200": 120, "201-500": 350, "501-2000": 1000, "2000+": 2500 };
          employeesCount = map[e] || parseInt(e, 10) || 100;
        }
      }
      
      let industryBenchmarks = {
        Technology: 8, Manufacturing: 25, Retail: 15, Healthcare: 18, Finance: 6,
        Education: 10, Logistics: 30, Other: 12
      };
      let industryAvg = industryBenchmarks[company?.industry] || 12;
      
      let perEmployee = newTotal / employeesCount;
      let rawScore = 100 - (perEmployee / industryAvg) * 50;
      let newScore = Math.max(0, Math.min(100, Math.round(rawScore)));

      return {
        totalTonnes: newTotal,
        carbonScore: newScore,
        saved: tonnesSaved
      };
    } catch {
      return {
        totalTonnes: emissions.totalTonnes || 0,
        carbonScore: emissions.carbonScore || 0,
        saved: 0
      };
    }
  }, [sliders, company, emissions]);

  const baseTotal = emissions.totalTonnes || 0;
  const currentScore = emissions.carbonScore ? Math.round(emissions.carbonScore) : 0;
  
  const currentGrade = getGradeDetails(currentScore);
  const projectedGrade = getGradeDetails(adjusted.carbonScore);

  const costSaving = adjusted.saved * 50;

  return (
    <motion.div
      className="card-premium p-5 md:p-6 mt-6"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">
            🎮 What-If Scenario Simulator
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Drag the sliders to simulate decarbonization scenarios in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-[11px] md:text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:border-accentLime hover:text-white bg-slate-800/40 backdrop-blur-md transition-colors"
        >
          Reset scenario
        </button>
      </div>
      
      <div className="grid md:grid-cols-5 gap-8 mb-8">
        <div className="space-y-6 md:col-span-3">
          <Slider
            label="Reduce electricity consumption"
            suffix="%"
            value={sliders.electricityReduction}
            max={100}
            onChange={handleChange("electricityReduction")}
          />
          <Slider
            label="Switch to renewable energy"
            suffix="%"
            value={sliders.renewableIncrease}
            max={100}
            onChange={handleChange("renewableIncrease")}
          />
          <Slider
            label="Reduce business flights"
            suffix="%"
            value={sliders.flightsReduction}
            max={100}
            onChange={handleChange("flightsReduction")}
          />
          <Slider
            label="Improve waste recycling"
            suffix="%"
            value={sliders.wasteRecyclingIncrease}
            max={100}
            onChange={handleChange("wasteRecyclingIncrease")}
          />
        </div>
        
        <div className="md:col-span-2 flex justify-center items-center">
          <CarbonScoreGauge score={adjusted.carbonScore} />
        </div>
      </div>

      {/* Projected Outcome Row */}
      <div className="rounded-2xl p-4 border border-[#84CC16] bg-[#E8F5E1] shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">New Total CO₂e</span>
              <span className="text-xl font-extrabold text-[#1A2E1A]">{adjusted.totalTonnes.toLocaleString(undefined, {maximumFractionDigits: 1})} t</span>
            </div>
            <div className="w-px h-8 bg-[#84CC16]/30 mx-2 hidden md:block"></div>
            
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tonnes Saved</span>
              <span className="text-xl font-extrabold text-[#059669]">{adjusted.saved.toLocaleString(undefined, {maximumFractionDigits: 1})} t</span>
            </div>
            <div className="w-px h-8 bg-[#84CC16]/30 mx-2 hidden md:block"></div>
            
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Cost Savings</span>
              <span className="text-xl font-extrabold text-[#D97706]">${costSaving.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-white/50">
            <div className="text-sm font-bold text-slate-600">
              Current: <span style={{color: currentGrade.color}}>{currentGrade.grade} {currentScore}</span>
            </div>
            
            <div className="text-[#059669] font-black text-lg">→</div>
            
            <div className="text-sm font-bold text-slate-800">
              Projected: <span className="px-2 py-0.5 rounded-md text-white ml-1 shadow-sm" style={{backgroundColor: projectedGrade.color}}>
                {projectedGrade.grade} {adjusted.carbonScore}
              </span>
            </div>
          </div>

        </div>
      </div>

    </motion.div>
  );
}

function Slider({ label, value, max, suffix, onChange }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="text-xs font-medium text-white">{label}</div>
        <div className="text-xs text-accentLime font-semibold">
          {value}{suffix}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={onChange}
        className="slider-premium w-full mt-2"
        style={{
          accentColor: '#84CC16'
        }}
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>0{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}
function StatCard({ label, value, positive, highlight }) {
  return (
    <div
      className={`rounded-xl px-3 py-2 border bg-slate-800/40 backdrop-blur-md transition-colors ${
        highlight
          ? "border-amber-300 bg-amber-50 shadow-[0_0_0_1px_rgba(250,204,21,0.4)]"
          : "border-white/10"
      }`}
    >
      <div className="text-[11px] text-slate-400 mb-0.5">{label}</div>
      <div
        className={`text-xs font-semibold ${
          positive ? "text-good" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default WhatIfSimulator;

