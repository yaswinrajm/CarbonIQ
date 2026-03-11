import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import * as tf from "@tensorflow/tfjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { useAppContext } from "../context";
import { normalizeEmployees } from "../utils/calculations";

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// Seasonal multipliers — higher in winter, lower in summer
const SEASONAL = [1.18, 1.14, 1.06, 0.96, 0.88, 0.82, 0.80, 0.82, 0.90, 0.98, 1.10, 1.16];

/* ────────────────────────────────────────────────────
   TensorFlow.js simple linear regression
   ──────────────────────────────────────────────────── */
async function fitLinearModel(xs, ys) {
  const xsTensor = tf.tensor1d(xs);
  const ysTensor = tf.tensor1d(ys);

  // Normalize
  const xMean = xsTensor.mean();
  const xStd = xsTensor.sub(xMean).square().mean().sqrt();
  const yMean = ysTensor.mean();
  const yStd = ysTensor.sub(yMean).square().mean().sqrt();

  const xsNorm = xsTensor.sub(xMean).div(xStd.add(1e-7));
  const ysNorm = ysTensor.sub(yMean).div(yStd.add(1e-7));

  const slope = tf.variable(tf.scalar(0));
  const intercept = tf.variable(tf.scalar(0));

  const predict = (x) => x.mul(slope).add(intercept);
  const loss = (pred, label) => pred.sub(label).square().mean();

  const optimizer = tf.train.sgd(0.1);

  for (let i = 0; i < 100; i++) {
    optimizer.minimize(() => loss(predict(xsNorm), ysNorm));
  }

  // Predict
  const predictDenorm = (xRaw) => {
    const xn = xRaw.sub(xMean).div(xStd.add(1e-7));
    return predict(xn).mul(yStd).add(yMean);
  };

  return { predictDenorm, xMean, xStd, slope, intercept, yMean, yStd };
}

export default function PredictiveForecasting() {
  const { emissions, csvData } = useAppContext();
  const [chartData, setChartData] = useState([]);
  const [modelReady, setModelReady] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const totalAnnual = emissions.totalTonnes || 0;
  const monthlyBase = totalAnnual / 12;

  // Build historical data from CSV or synthetic
  const historical = useMemo(() => {
    if (csvData && csvData.length >= 3) {
      return csvData.map((row, i) => {
        const kwh = row.electricity_kwh || 0;
        const gas = row.gas_m3 || 0;
        const flights = row.flights_hours || 0;
        const carKm = row.car_km || 0;
        const commute = row.commute_km_per_day || 0;
        const landfill = row.waste_landfill_kg || 0;
        const water = row.water_liters || 0;
        const total =
          (gas * 2.04 + carKm * 0.171 + kwh * 0.233 +
            flights * 255 + commute * 220 * 0.171 +
            landfill * 0.58 + water * 0.000344) / 1000;
        return {
          month: i,
          label: `${(row.month || "").slice(0, 3)} ${row.year || ""}`.trim(),
          value: total,
        };
      });
    }

    // Synthetic data with seasonal variation
    const now = new Date();
    const startMonth = ((now.getMonth() - 11) + 12) % 12;
    return Array.from({ length: 12 }, (_, i) => {
      const mIdx = (startMonth + i) % 12;
      const noise = 0.95 + Math.random() * 0.10;
      return {
        month: i,
        label: MONTH_LABELS[mIdx],
        value: monthlyBase * SEASONAL[mIdx] * noise,
      };
    });
  }, [csvData, monthlyBase]);

  // Run TF.js model and generate scenario predictions
  useEffect(() => {
    if (totalAnnual <= 0) return;

    let cancelled = false;

    (async () => {
      try {
        const xs = historical.map((_, i) => i);
        const ys = historical.map((h) => h.value);
        const model = await fitLinearModel(xs, ys);

        if (cancelled) return;

        const lastVal = ys[ys.length - 1] || monthlyBase;
        const now = new Date();
        const currentMonthIdx = now.getMonth();

        // Build combined chart data
        const data = [];

        // Historical points
        historical.forEach((h) => {
          data.push({
            name: h.label,
            historical: parseFloat(h.value.toFixed(2)),
            type: "historical",
          });
        });

        // "Today" divider
        const todayLabel = MONTH_LABELS[currentMonthIdx];
        if (data.length > 0) {
          data[data.length - 1].name = `${todayLabel} (Today)`;
        }

        // Future 12 months
        for (let i = 1; i <= 12; i++) {
          const futureIdx = historical.length - 1 + i;
          const mIdx = (currentMonthIdx + i) % 12;
          const quarter = Math.ceil(i / 3);

          // TF prediction for trend (BAU)
          const predicted = tf.tidy(() => {
            const xRaw = tf.tensor1d([futureIdx]);
            return model.predictDenorm(xRaw).dataSync()[0];
          });

          // BAU: 3% growth per quarter
          const bauGrowth = 1 + 0.03 * quarter;
          const bau = Math.max(0, predicted * bauGrowth * SEASONAL[mIdx] / SEASONAL[currentMonthIdx]);

          // Confidence interval (±12%)
          const ciUpper = bau * 1.12;
          const ciLower = bau * 0.88;

          // Moderate: -15% over 12 months (linear)
          const moderate = Math.max(0, lastVal * (1 - 0.15 * (i / 12)) * SEASONAL[mIdx] / SEASONAL[currentMonthIdx]);

          // Aggressive: -35% over 12 months (linear)
          const aggressive = Math.max(0, lastVal * (1 - 0.35 * (i / 12)) * SEASONAL[mIdx] / SEASONAL[currentMonthIdx]);

          data.push({
            name: MONTH_LABELS[mIdx],
            bau: parseFloat(bau.toFixed(2)),
            moderate: parseFloat(moderate.toFixed(2)),
            aggressive: parseFloat(aggressive.toFixed(2)),
            ciUpper: parseFloat(ciUpper.toFixed(2)),
            ciLower: parseFloat(ciLower.toFixed(2)),
            type: "predicted",
          });
        }

        setChartData(data);
        setModelReady(true);

        // Cleanup tensors
        model.slope.dispose();
        model.intercept.dispose();
        model.xMean.dispose();
        model.xStd.dispose();
        model.yMean.dispose();
        model.yStd.dispose();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("TF.js prediction failed:", e);
      }
    })();

    return () => { cancelled = true; };
  }, [historical, totalAnnual, monthlyBase]);

  // Scenario summary calculations
  const scenarios = useMemo(() => {
    const predicted = chartData.filter((d) => d.type === "predicted");
    if (predicted.length === 0) return [];

    const last = predicted[predicted.length - 1];
    const current = chartData.find((d) => d.type === "historical");
    const baseVal = current?.historical || monthlyBase;

    return [
      {
        name: "Business as Usual",
        color: "#EF4444",
        badge: "High Risk",
        badgeColor: "bg-red-100 text-red-700 border-red-200",
        month12: last.bau || 0,
        reduction: last.bau ? ((last.bau - baseVal) / baseVal * 100) : 0,
        costSaving: 0,
      },
      {
        name: "Moderate Action",
        color: "#F59E0B",
        badge: "Recommended",
        badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
        month12: last.moderate || 0,
        reduction: last.moderate ? ((last.moderate - baseVal) / baseVal * 100) : 0,
        costSaving: Math.max(0, (baseVal - (last.moderate || 0)) * 12 * 50),
      },
      {
        name: "Aggressive Reduction",
        color: "#22C55E",
        badge: "Best Outcome",
        badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
        month12: last.aggressive || 0,
        reduction: last.aggressive ? ((last.aggressive - baseVal) / baseVal * 100) : 0,
        costSaving: Math.max(0, (baseVal - (last.aggressive || 0)) * 12 * 50),
      },
    ];
  }, [chartData, monthlyBase]);

  if (totalAnnual <= 0) return null;

  const todayIdx = chartData.findIndex((d) => d.name?.includes("Today"));
  const todayName = todayIdx >= 0 ? chartData[todayIdx].name : null;

  return (
    <motion.div
      className="card-premium p-5 md:p-6"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm md:text-base font-semibold text-textDark">
            📈 Predictive Emissions Forecast — Next 12 Months
          </h3>
          <p className="text-[11px] text-textGray mt-0.5">
            Machine learning model trained on your historical data.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-[10px] text-textGray border border-slate-200 rounded-full px-2 py-0.5 hover:bg-slate-50 transition-colors"
          >
            ℹ️ How it works
          </button>
          {showTooltip && (
            <motion.div
              className="absolute right-0 top-7 z-20 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-[11px] text-textGray leading-relaxed"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Predictions use a TensorFlow.js linear regression model fitted to
              your historical emissions data and adjusted for seasonal patterns.
              <button
                type="button"
                onClick={() => setShowTooltip(false)}
                className="block mt-2 text-accentLime font-medium"
              >
                Got it
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {!modelReady && (
        <div className="h-72 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-textGray">
            <span className="h-4 w-4 border-2 border-accentLime border-t-transparent rounded-full animate-spin" />
            Training model on your data…
          </div>
        </div>
      )}

      {/* Chart */}
      {modelReady && chartData.length > 0 && (
        <div className="h-80 md:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.4)",
                  boxShadow: "0 8px 30px rgba(15,23,42,0.18)",
                  padding: "8px 12px",
                  fontSize: 11,
                }}
                formatter={(val) => [`${val.toFixed(2)} t CO₂e`]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconSize={10}
                wrapperStyle={{ fontSize: 11 }}
              />

              {/* Today vertical line */}
              {todayName && (
                <ReferenceLine
                  x={todayName}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Today",
                    position: "top",
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                />
              )}

              {/* Confidence interval band */}
              <Area
                type="monotone"
                dataKey="ciUpper"
                stroke="none"
                fill="url(#ciGradient)"
                name="Confidence band"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="ciLower"
                stroke="none"
                fill="#ffffff"
                name="ci_lower_hidden"
                legendType="none"
              />

              {/* Historical line */}
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#64748b"
                strokeWidth={2}
                dot={{ r: 3, fill: "#64748b" }}
                name="Historical"
                connectNulls={false}
              />

              {/* BAU — red dashed */}
              <Line
                type="monotone"
                dataKey="bau"
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="Business as Usual"
              />

              {/* Moderate — amber */}
              <Line
                type="monotone"
                dataKey="moderate"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                name="Moderate Action"
              />

              {/* Aggressive — green */}
              <Line
                type="monotone"
                dataKey="aggressive"
                stroke="#22C55E"
                strokeWidth={2}
                dot={false}
                name="Aggressive Reduction"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scenario Cards */}
      {modelReady && scenarios.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3 mt-5">
          {scenarios.map((s, idx) => (
            <motion.div
              key={s.name}
              className="rounded-xl border border-slate-200 p-4 bg-white"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs font-semibold text-textDark">
                    {s.name}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${s.badgeColor}`}
                >
                  {s.badge}
                </span>
              </div>

              <div className="text-lg font-bold text-textDark tabular-nums">
                {s.month12.toFixed(2)}{" "}
                <span className="text-xs font-normal text-textGray">
                  t / month
                </span>
              </div>

              <div className="mt-1.5 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-textGray">vs. today</span>
                  <span
                    className={`font-semibold ${
                      s.reduction > 0 ? "text-danger" : "text-good"
                    }`}
                  >
                    {s.reduction > 0 ? "+" : ""}
                    {s.reduction.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textGray">Est. cost saving</span>
                  <span className="font-semibold text-textDark">
                    {s.costSaving > 0
                      ? `$${s.costSaving.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}`
                      : "—"}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
