import React from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

const radius = 70;
const circumference = 2 * Math.PI * radius;

function colorForScore(score) {
  if (score >= 66) return "#16a34a"; // B / A – green
  if (score >= 51) return "#eab308"; // C – yellow
  return "#ef4444"; // D / F – red
}

function labelForScore(score) {
  if (score >= 81) return { grade: "A", text: "Excellent" };
  if (score >= 66) return { grade: "B", text: "Good" };
  if (score >= 51) return { grade: "C", text: "Average" };
  if (score >= 31) return { grade: "D", text: "Poor" };
  return { grade: "F", text: "Critical" };
}

export function CarbonScoreGauge({ score = 0 }) {
  const clamped = Math.max(0, Math.min(100, score || 0));
  const motionScore = useSpring(clamped, {
    stiffness: 80,
    damping: 18,
    mass: 0.7,
  });
  const dashOffset = useTransform(
    motionScore,
    (v) => circumference - (circumference * Math.min(v, 100)) / 100 || circumference
  );

  const roundedScore = useTransform(motionScore, (v) =>
    Number.isFinite(v) ? Math.round(v) : 0
  );

  const [color, grade, text] = (function useLabels() {
    const v = clamped;
    const c = colorForScore(v);
    const { grade: g, text: t } = labelForScore(v);
    return [c, g, t];
  })();

  return (
    <div className="flex items-center gap-6">
      <svg width="190" height="120" viewBox="0 0 190 120">
        <g transform="translate(95,95)">
          {/* Background arc */}
          <path
            d="
              M -80 0
              A 80 80 0 0 1 80 0
            "
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Active arc */}
          <motion.circle
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashOffset }}
            strokeLinecap="round"
            transform="rotate(-180)"
          />
        </g>
      </svg>
      <div className="space-y-1">
        <div className="text-xs font-semibold tracking-wide text-textGray uppercase">
          CarbonIQ Score
        </div>
        <div className="flex items-baseline gap-2">
          <motion.span
            className="text-4xl font-bold text-textDark tabular-nums"
          >
            {roundedScore}
          </motion.span>
          <span className="text-sm text-textGray">/ 100</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${color}20`,
              color,
            }}
          >
            Grade {grade}
          </span>
          <span className="text-xs text-textGray">{text} footprint</span>
        </div>
        <p className="text-xs text-textGray/80 max-w-xs">
          Score reflects your emissions per employee relative to industry
          benchmarks. Higher is better.
        </p>
      </div>
    </div>
  );
}

export default CarbonScoreGauge;

