import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../context";
import { applyWhatIfAdjustments } from "../utils/calculations";
import CarbonScoreGauge from "./CarbonScoreGauge";

// Smoothly animate numbers toward a target
function useAnimatedNumber(target, duration = 500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = value;
    const to = Number.isFinite(target) ? target : 0;
    let frame;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (to - from) * eased;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
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
      return applyWhatIfAdjustments(rawInput, sliders, company);
    } catch {
      return emissions;
    }
  }, [rawInput, sliders, company, emissions]);

  const baseTotal = emissions.totalTonnes || 0;
  const adjustedTotal = adjusted.totalTonnes || 0;
  const saved = Math.max(0, baseTotal - adjustedTotal);
  const carbonPrice = 50;
  const costSaving = saved * carbonPrice;

  // Animated metrics
  const animatedTotal = useAnimatedNumber(adjustedTotal);
  const animatedSaved = useAnimatedNumber(saved);
  const animatedCost = useAnimatedNumber(costSaving);
  const animatedScore = useAnimatedNumber(adjusted.carbonScore || 0);

  // Highlight the main saving metric when there is any saving
  const highlightSavings = saved > 0;

  return (
    <motion.div
      className="card-premium p-5 md:p-6 mt-6"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-textDark">
            🎮 What-If Scenario Simulator
          </h2>
          <p className="text-xs md:text-sm text-textGray">
            Drag the sliders to simulate decarbonization scenarios in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-[11px] md:text-xs px-3 py-1.5 rounded-full border border-slate-200 text-textGray hover:border-accentLime hover:text-textDark bg-lightBg transition-colors"
        >
          Reset scenario
        </button>
      </div>
      <div className="grid md:grid-cols-5 gap-6">
        <div className="space-y-4 md:col-span-3">
          <Slider
            label="Reduce electricity consumption"
            suffix="%"
            value={sliders.electricityReduction}
            max={50}
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
        <div className="md:col-span-2 flex flex-col gap-4 justify-center">
          <div className="flex justify-center">
            <CarbonScoreGauge score={animatedScore} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
            <StatCard
              label="New total emissions"
              value={
                Number.isFinite(animatedTotal)
                  ? `${animatedTotal.toFixed(1)} t CO₂e`
                  : "—"
              }
            />
            <StatCard
              label="Tonnes saved vs current"
              value={`${animatedSaved.toFixed(1)} t`}
              positive
              highlight={highlightSavings}
            />
            <StatCard
              label="Estimated annual cost savings"
              value={
                Number.isFinite(animatedCost)
                  ? `$${animatedCost.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}`
                  : "—"
              }
              positive
              highlight={highlightSavings}
            />
            <StatCard
              label="New CarbonIQ score"
              value={
                animatedScore
                  ? `${Math.round(animatedScore)}/100`
                  : "—"
              }
            />
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
        <div className="text-xs font-medium text-textDark">{label}</div>
        <div className="text-xs text-accentLime font-semibold">
          {value}
          {suffix}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={onChange}
        className="slider-premium"
      />
      <div className="flex justify-between text-[10px] text-textGray mt-1">
        <span>0{suffix}</span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}
function StatCard({ label, value, positive, highlight }) {
  return (
    <div
      className={`rounded-xl px-3 py-2 border bg-lightBg transition-colors ${
        highlight
          ? "border-amber-300 bg-amber-50 shadow-[0_0_0_1px_rgba(250,204,21,0.4)]"
          : "border-slate-200"
      }`}
    >
      <div className="text-[11px] text-textGray mb-0.5">{label}</div>
      <div
        className={`text-xs font-semibold ${
          positive ? "text-good" : "text-textDark"
        }`}
      >
        {value}
      </div>
    </div>
  );
}


export default WhatIfSimulator;

