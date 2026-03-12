import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

function getColor(score) {
  if (score >= 81) return "#22C55E"; // A - Green
  if (score >= 66) return "#84CC16"; // B - Lime
  if (score >= 51) return "#F59E0B"; // C - Amber
  if (score >= 31) return "#F97316"; // D - Orange
  return "#EF4444"; // F - Red
}

function getGradeInfo(score) {
  if (score >= 81) return { grade: "A", desc: "Excellent footprint" };
  if (score >= 66) return { grade: "B", desc: "Good footprint" };
  if (score >= 51) return { grade: "C", desc: "Average footprint" };
  if (score >= 31) return { grade: "D", desc: "Poor footprint" };
  return { grade: "F", desc: "Critical footprint" };
}

export function CarbonScoreGauge({ score = 0 }) {
  const clamped = Math.max(0, Math.min(100, score || 0));
  
  // Animate from 0 to actual score
  const motionScore = useSpring(0, {
    stiffness: 60,
    damping: 20,
    mass: 1,
  });

  useEffect(() => {
    // Slight delay so the user can see the animation begin from 0
    const timeout = setTimeout(() => {
      motionScore.set(clamped);
    }, 100);
    return () => clearTimeout(timeout);
  }, [clamped, motionScore]);

  // Radius 90 fits well inside 200px total width
  const r = 90;
  const circ = Math.PI * r;
  
  // Dash offset models drawing the semicircle from left to right
  const dashOffset = useTransform(motionScore, (v) => circ * (1 - v / 100));
  
  // Dot coordinates utilizing trigonometry
  // Angle starts at PI (left) and rotates to 0 (right)
  const dotX = useTransform(motionScore, (v) => 100 + r * Math.cos(Math.PI - (v / 100) * Math.PI));
  const dotY = useTransform(motionScore, (v) => 100 - r * Math.sin(Math.PI - (v / 100) * Math.PI));

  // Capture color and text based on the final rounded score
  const color = getColor(clamped);
  const { grade, desc } = getGradeInfo(clamped);

  // We need local state for the numerical text to update synchronously with the spring motion if not rendering it directly as motionValue
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const unsubscribe = motionScore.on("change", (latest) => {
      setDisplayScore(Math.round(latest));
    });
    return () => unsubscribe();
  }, [motionScore]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col items-center w-full max-w-sm mx-auto">
      
      {/* Gauge Container (200px wide, 110px high padding boundary) */}
      <div className="relative w-[200px] h-[110px] flex justify-center mb-6">
        
        <svg width="200" height="110" viewBox="0 0 200 110" className="absolute top-0 left-0 overflow-visible">
          {/* Background track */}
          <path
            d={`M 10 100 A ${r} ${r} 0 0 1 190 100`}
            fill="none"
            stroke="#E8F5E1"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Filled animated arc */}
          <motion.path
            d={`M 10 100 A ${r} ${r} 0 0 1 190 100`}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={circ}
            style={{ strokeDashoffset: dashOffset }}
            strokeLinecap="round"
          />
          {/* Animated endpoint needle dot */}
          <motion.circle
            cx={dotX}
            cy={dotY}
            r="8"
            fill={color}
            stroke="#ffffff"
            strokeWidth="3"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}
          />
        </svg>
        
        {/* Large Score Number Centered in the Arc */}
        <div 
          className="absolute bottom-[-16px] left-0 w-full text-center flex items-baseline justify-center"
        >
          <span style={{ fontSize: "48pt", fontWeight: "800", color, lineHeight: "1", letterSpacing: "-0.05em" }}>
            {displayScore}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-3 mt-4">
        {/* Grade Pill Badge */}
        <div 
          className="px-5 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          Grade {grade}
        </div>
        
        {/* X / 100 Text */}
        <div className="text-sm font-medium text-slate-400">
          {Math.round(clamped)} / 100
        </div>
        
        {/* Grade Description */}
        <div className="text-[15px] font-semibold text-slate-700">
          {desc}
        </div>
      </div>
    
    </div>
  );
}

export default CarbonScoreGauge;

