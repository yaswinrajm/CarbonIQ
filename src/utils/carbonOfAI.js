/**
 * carbonOfAI.js — CodeCarbon-inspired AI carbon footprint tracker
 *
 * Measures the carbon cost of every Gemini API call using:
 *   carbon_kg = duration_seconds × 0.0000023 (avg GPU kW) × 0.233 (UK grid factor)
 *
 * Stores a running session log so the floating badge and AI Insights
 * page can display a breakdown.
 */

// carbon_kg = seconds × GPU_KW × GRID_FACTOR
const GPU_KW = 0.0000023;      // average GPU energy consumption (kW)
const GRID_FACTOR = 0.233;     // UK grid emission factor (kg CO₂e / kWh)
const LED_WATTS = 0.01;        // 10 W LED bulb in kW
const LED_KG_PER_SEC = LED_WATTS * GRID_FACTOR / 3600; // kg CO₂e per second of LED

// Session log — persists in memory for the lifetime of the tab
let sessionLog = [];
let listeners = [];

/** Subscribe to log changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function notify() {
  listeners.forEach((fn) => fn(getSnapshot()));
}

/** Get a read-only snapshot of the current session. */
export function getSnapshot() {
  const totalKg = sessionLog.reduce((s, e) => s + e.carbonKg, 0);
  const totalGrams = totalKg * 1000;
  const ledSeconds =
    totalKg > 0 && LED_KG_PER_SEC > 0 ? totalKg / LED_KG_PER_SEC : 0;
  const ledSecondsUser = totalGrams / 0.00833;

  return {
    entries: [...sessionLog],
    totalKg,
    totalGrams,
    ledSeconds,
    ledSecondsUser,
  };
}

/**
 * Wrap an async function so that its execution time is measured
 * and the carbon cost is recorded.
 *
 * @param {string} operationName  e.g. "Data Analysis", "Chat Message"
 * @param {() => Promise<T>} fn   the async work
 * @returns {Promise<T>}
 */
export async function trackAI(operationName, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    const durationSec = (performance.now() - start) / 1000;
    const carbonKg = durationSec * GPU_KW * GRID_FACTOR;

    sessionLog.push({
      id: Date.now() + Math.random(),
      operation: operationName,
      durationSec,
      carbonKg,
      carbonGrams: carbonKg * 1000,
      timestamp: new Date().toISOString(),
    });

    notify();
    return result;
  } catch (e) {
    // Still record the carbon cost of a failed call
    const durationSec = (performance.now() - start) / 1000;
    const carbonKg = durationSec * GPU_KW * GRID_FACTOR;

    sessionLog.push({
      id: Date.now() + Math.random(),
      operation: `${operationName} (failed)`,
      durationSec,
      carbonKg,
      carbonGrams: carbonKg * 1000,
      timestamp: new Date().toISOString(),
    });

    notify();
    throw e;
  }
}
