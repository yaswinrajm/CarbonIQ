import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribe, getSnapshot } from "../utils/carbonOfAI";

/* ─────────────────────────────────────────────────────
   Animated counter — smoothly counts up to `target`
   ───────────────────────────────────────────────────── */
function useAnimatedValue(target, duration = 600) {
  const [display, setDisplay] = useState(target);
  const raf = useRef(null);

  useEffect(() => {
    const start = display;
    const diff = target - start;
    if (Math.abs(diff) < 0.0001) return;
    const t0 = performance.now();
    const step = (now) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(start + diff * eased);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

export default function AICarbonBadge() {
  const [snapshot, setSnapshot] = useState(getSnapshot);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    return subscribe((s) => setSnapshot(s));
  }, []);

  const animatedGrams = useAnimatedValue(snapshot.totalGrams);

  return (
    <>
      {/* ── Floating Badge ── */}
      <div
        className="fixed bottom-4 left-4"
        style={{ zIndex: 9999, marginLeft: 0 }}
      >
        <div className="relative">
          {/* Hover tooltip */}
          <AnimatePresence>
            {hovered && !expanded && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-full left-0 mb-2 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] whitespace-nowrap shadow-lg"
              >
                CarbonIQ measures its own AI carbon footprint — because every byte counts.
                <div className="absolute bottom-0 left-4 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Badge button */}
          <motion.button
            type="button"
            onClick={() => setExpanded(!expanded)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="inline-flex items-center gap-2 shadow-lg text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: "#1A2E1A",
              border: "1.5px solid #97BC62",
              borderRadius: 20,
              padding: "8px 16px",
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="text-sm">🌱</span>
            <span className="text-emerald-300/80">AI Carbon Used:</span>
            <span className="font-bold text-white tabular-nums">
              {animatedGrams.toFixed(2)}g
            </span>
            <span className="text-emerald-300/80">CO₂e</span>
          </motion.button>
        </div>

        {/* ── Expanded Card ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute bottom-12 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-textDark flex items-center gap-1.5">
                    🌱 AI Session Carbon Footprint
                  </h4>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="text-textGray hover:text-textDark text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Operation breakdown */}
              <div className="px-4 py-3 max-h-52 overflow-y-auto">
                {snapshot.entries.length === 0 ? (
                  <p className="text-[11px] text-textGray italic">
                    No AI operations yet this session.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {snapshot.entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-accentLime" />
                          <span className="text-textDark font-medium">
                            {e.operation}
                          </span>
                        </div>
                        <span className="text-textGray tabular-nums">
                          {e.carbonGrams.toFixed(4)}g
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-textGray">Total session carbon</span>
                  <span className="font-bold text-textDark tabular-nums">
                    {snapshot.totalGrams.toFixed(4)}g CO₂e
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-textGray">Equivalent to</span>
                  <span className="font-medium text-textDark">
                    {snapshot.ledSecondsUser?.toFixed?.(1) || "0.0"} seconds of LED bulb usage
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
