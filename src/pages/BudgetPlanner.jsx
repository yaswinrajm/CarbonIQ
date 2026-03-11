import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  ReferenceLine,
} from "recharts";
import { useAppContext } from "../context";
import { chatWithData } from "../utils/geminiAPI";

/* ═══════════════════════════════════════════════
   Constants & helpers
   ═══════════════════════════════════════════════ */
const DEPT_SPLITS = [
  { name: "Operations", pct: 0.3 },
  { name: "IT", pct: 0.2 },
  { name: "Facilities", pct: 0.18 },
  { name: "Sales", pct: 0.12 },
  { name: "HR", pct: 0.08 },
  { name: "Marketing", pct: 0.07 },
  { name: "Logistics", pct: 0.05 },
];

const PIE_COLORS = [
  "#2C5F2D", "#3E7D40", "#5A9A5C", "#78B07A",
  "#97BC62", "#B8D89B", "#D4E8C4",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const cardStyle = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  padding: 24,
};

function statusBadge(pct) {
  if (pct > 95) return { label: "Over Budget", bg: "#FEE2E2", color: "#DC2626" };
  if (pct > 80) return { label: "At Risk", bg: "#FEF3C7", color: "#D97706" };
  return { label: "On Track", bg: "#D1FAE5", color: "#059669" };
}

function ProgressRing({ size = 80, pct = 0 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(pct, 100);
  const offset = circ - (clamped / 100) * circ;
  const ringColor = pct > 90 ? "#DC2626" : pct > 75 ? "#D97706" : "#2C5F2D";

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "auto" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={ringColor} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 14, fontWeight: 700, fill: "#1A2E1A" }}>
        {clamped.toFixed(0)}%
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
export default function BudgetPlanner() {
  const { emissions, company } = useAppContext();
  const totalEmissions = emissions.totalTonnes || 0;

  /* ── state ── */
  const [budgetCreated, setBudgetCreated] = useState(false);
  const [totalBudget, setTotalBudget] = useState(
    totalEmissions > 0 ? +(totalEmissions * 0.8).toFixed(2) : 100
  );
  const [budgetYear, setBudgetYear] = useState("2025");
  const [currency, setCurrency] = useState("USD");
  const [departments, setDepartments] = useState([]);
  const [quarters, setQuarters] = useState([
    { label: "Q1", budget: 0, actual: 0 },
    { label: "Q2", budget: 0, actual: 0 },
    { label: "Q3", budget: 0, actual: 0 },
    { label: "Q4", budget: 0, actual: 0 },
  ]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const typewriterRef = useRef(null);

  /* ── derived ── */
  const deptTotal = departments.reduce((s, d) => s + (d.allocated || 0), 0);
  const unallocated = +(totalBudget - deptTotal).toFixed(2);
  const totalActual = departments.reduce((s, d) => s + (d.actual || 0), 0);
  const variance = totalBudget - totalActual;
  const variancePct = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;
  const currentMonth = new Date().getMonth(); // 0-11
  const projectedYearEnd = currentMonth > 0 ? (totalActual / (currentMonth)) * 12 : totalActual * 12;

  /* ── handlers ── */
  function handleCreate() {
    const depts = DEPT_SPLITS.map((d) => ({
      name: d.name,
      allocated: +(totalBudget * d.pct).toFixed(2),
      actual: 0,
    }));
    setDepartments(depts);
    const qBudget = +(totalBudget / 4).toFixed(2);
    setQuarters([
      { label: "Q1", budget: qBudget, actual: 0 },
      { label: "Q2", budget: qBudget, actual: 0 },
      { label: "Q3", budget: qBudget, actual: 0 },
      { label: "Q4", budget: qBudget, actual: 0 },
    ]);
    setBudgetCreated(true);
  }

  function updateDept(idx, field, value) {
    setDepartments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === "name" ? value : +value || 0 };
      return next;
    });
  }

  function removeDept(idx) {
    setDepartments((prev) => prev.filter((_, i) => i !== idx));
  }

  function addDept() {
    setDepartments((prev) => [...prev, { name: "New Department", allocated: 0, actual: 0 }]);
  }

  function updateQuarter(idx, value) {
    setQuarters((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], actual: +value || 0 };
      return next;
    });
  }

  /* ── AI analysis ── */
  async function generateAnalysis() {
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const deptSummary = departments
        .map((d) => `${d.name}: budgeted ${d.allocated}t, actual ${d.actual}t (${d.allocated > 0 ? ((d.actual / d.allocated) * 100).toFixed(0) : 0}% used)`)
        .join("; ");
      const qSummary = quarters
        .map((q) => `${q.label}: budgeted ${q.budget}t, actual ${q.actual}t`)
        .join("; ");
      const prompt = `Analyze this carbon budget for ${company.name || "the organization"}.
Total budget: ${totalBudget}t CO2e. Year: ${budgetYear}.
Departments: ${deptSummary}.
Quarters: ${qSummary}.
Total actual: ${totalActual}t. Variance: ${variance.toFixed(2)}t.
Projected year-end: ${projectedYearEnd.toFixed(2)}t.

Provide:
1. Which departments are at highest risk of exceeding their carbon budget and why
2. Which months historically spike for this industry (${company.industry}) and reasons
3. Three specific, actionable recommendations to stay within the annual carbon budget

Be concise and specific with numbers.`;

      const response = await chatWithData(
        [{ role: "user", content: prompt }],
        emissions,
        company
      );
      // Typewriter effect
      let i = 0;
      const text = response;
      const interval = setInterval(() => {
        i += 2;
        setAiAnalysis(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, 10);
      typewriterRef.current = interval;
    } catch (e) {
      setAiAnalysis("Failed to generate analysis. Please check your API key and try again.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => () => clearInterval(typewriterRef.current), []);

  /* ── alerts ── */
  const alerts = [];
  departments.forEach((d) => {
    if (d.allocated > 0 && (d.actual / d.allocated) >= 0.8) {
      const key = `dept-${d.name}`;
      if (!dismissedAlerts.includes(key)) {
        alerts.push({
          key,
          type: "red",
          icon: "🔴",
          text: `${d.name} has used ${((d.actual / d.allocated) * 100).toFixed(0)}% of its carbon budget (${d.actual}t of ${d.allocated}t allocated).`,
        });
      }
    }
  });
  quarters.forEach((q, i) => {
    const monthsInQ = 3;
    const monthsElapsed = Math.min(3, Math.max(0.5, currentMonth - i * 3));
    const projected = (q.actual / monthsElapsed) * monthsInQ;
    if (q.budget > 0 && projected > q.budget) {
      const key = `q-${q.label}`;
      if (!dismissedAlerts.includes(key)) {
        alerts.push({
          key,
          type: "amber",
          icon: "🟡",
          text: `${q.label} is projected to exceed budget at current rate (projected: ${projected.toFixed(1)}t vs budget: ${q.budget}t).`,
        });
      }
    }
  });
  if (totalActual > 0 && variance > 0 && variancePct > 20) {
    const key = "positive-trend";
    if (!dismissedAlerts.includes(key)) {
      alerts.push({
        key,
        type: "green",
        icon: "🟢",
        text: `Great progress! You are ${variancePct.toFixed(0)}% under budget. At this rate, you'll save ${variance.toFixed(1)}t CO₂e this year.`,
      });
    }
  }

  /* ── monthly chart data ── */
  const monthlyBudget = totalBudget / 12;
  const monthlyChart = MONTHS.map((m, i) => {
    const qIdx = Math.floor(i / 3);
    const qActual = quarters[qIdx]?.actual || 0;
    const monthActual = qActual / 3;
    return { month: m, budget: +monthlyBudget.toFixed(2), actual: +monthActual.toFixed(2) };
  });

  /* ── pie data ── */
  const pieData = departments.filter(d => d.allocated > 0).map((d) => ({
    name: d.name,
    value: d.allocated,
  }));

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div className="p-4 md:p-6 space-y-6" style={{ background: "#F4F9F0", minHeight: "100vh" }}>
      {/* ── Page Header ── */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-accentLime/80" style={{ color: "#2C5F2D" }}>
          CARBONIQ
        </p>
        <h1 className="text-xl font-bold" style={{ color: "#1A2E1A" }}>
          💰 Carbon Budget Planner
        </h1>
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 1 — Budget Setup Card
         ═══════════════════════════════════════════════ */}
      {!budgetCreated && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <h2 style={{ color: "#1A2E1A", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Set Your Annual Carbon Budget
          </h2>
          <p style={{ color: "#64748B", fontSize: 13, marginBottom: 20 }}>
            Allocate your carbon allowance across departments and quarters — just like a financial budget.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#1A2E1A", display: "block", marginBottom: 4 }}>
                Total Annual Carbon Budget (tonnes CO₂e)
              </label>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(+e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #d1d5db", fontSize: 14 }}
              />
              {totalEmissions > 0 && (
                <p style={{ fontSize: 11, color: "#97BC62", marginTop: 4 }}>
                  Suggested: 20% below your current {totalEmissions.toFixed(1)}t total
                </p>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#1A2E1A", display: "block", marginBottom: 4 }}>
                Budget Year
              </label>
              <select
                value={budgetYear}
                onChange={(e) => setBudgetYear(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #d1d5db", fontSize: 14 }}
              >
                <option>2024</option><option>2025</option><option>2026</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#1A2E1A", display: "block", marginBottom: 4 }}>
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #d1d5db", fontSize: 14 }}
              >
                <option>USD</option><option>GBP</option><option>EUR</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCreate}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #97BC62, #2C5F2D)", color: "#fff",
              fontWeight: 700, fontSize: 16, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(44,95,45,0.3)",
            }}
          >
            Create Budget
          </button>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          SECTION 2 — Department Allocation
         ═══════════════════════════════════════════════ */}
      {budgetCreated && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <h2 style={{ color: "#1A2E1A", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Department Budget Allocation
          </h2>

          <div style={{ display: "flex", gap: 24 }}>
            {/* Table */}
            <div style={{ flex: 1, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
                <thead>
                  <tr style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px" }}>Department</th>
                    <th style={{ padding: "6px 8px" }}>Allocated (t)</th>
                    <th style={{ padding: "6px 8px", width: 140 }}>% of Total</th>
                    <th style={{ padding: "6px 8px" }}>Actual (t)</th>
                    <th style={{ padding: "6px 8px" }}>Variance</th>
                    <th style={{ padding: "6px 8px" }}>Status</th>
                    <th style={{ padding: "6px 8px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d, i) => {
                    const pctOfTotal = totalBudget > 0 ? (d.allocated / totalBudget) * 100 : 0;
                    const usedPct = d.allocated > 0 ? (d.actual / d.allocated) * 100 : 0;
                    const diff = d.allocated - d.actual;
                    const badge = statusBadge(usedPct);
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#F4F9F0" : "#fff", borderRadius: 8 }}>
                        <td style={{ padding: "8px" }}>
                          <input
                            value={d.name}
                            onChange={(e) => updateDept(i, "name", e.target.value)}
                            style={{ border: "none", background: "transparent", fontWeight: 600, fontSize: 13, color: "#1A2E1A", width: "100%" }}
                          />
                        </td>
                        <td style={{ padding: "8px" }}>
                          <input
                            type="number"
                            value={d.allocated}
                            onChange={(e) => updateDept(i, "allocated", e.target.value)}
                            style={{ width: 80, padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#e5e7eb" }}>
                              <div style={{ width: `${Math.min(pctOfTotal, 100)}%`, height: "100%", borderRadius: 3, background: "#97BC62", transition: "width 0.3s" }} />
                            </div>
                            <span style={{ fontSize: 11, color: "#64748B", minWidth: 32 }}>{pctOfTotal.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <input
                            type="number"
                            value={d.actual}
                            onChange={(e) => updateDept(i, "actual", e.target.value)}
                            style={{ width: 80, padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: "8px", fontSize: 13, fontWeight: 600 }}>
                          {diff >= 0 ? (
                            <span style={{ color: "#059669" }}>▼ {diff.toFixed(1)}t</span>
                          ) : (
                            <span style={{ color: "#DC2626" }}>▲ {Math.abs(diff).toFixed(1)}t</span>
                          )}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <button onClick={() => removeDept(i)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button onClick={addDept} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, border: "1.5px dashed #97BC62", background: "transparent", color: "#2C5F2D", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                + Add Department
              </button>
            </div>

            {/* Pie Chart */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={90}
                    paddingAngle={2}
                    animationDuration={600}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v.toFixed(2)}t`} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Unallocated warning */}
          {Math.abs(unallocated) > 0.01 && (
            <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 10, background: "#FEF3C7", border: "1px solid #F59E0B", fontSize: 12, fontWeight: 600, color: "#92400E" }}>
              ⚠️ {unallocated > 0 ? `${unallocated.toFixed(2)} tonnes unallocated` : `${Math.abs(unallocated).toFixed(2)} tonnes over-allocated`} — please distribute remaining budget.
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          SECTION 3 — Quarterly Budget Tracking
         ═══════════════════════════════════════════════ */}
      {budgetCreated && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle}>
          <h2 style={{ color: "#1A2E1A", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Quarterly Carbon Budget vs Actual
          </h2>

          {/* Quarter cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {quarters.map((q, i) => {
              const usedPct = q.budget > 0 ? (q.actual / q.budget) * 100 : 0;
              const monthsElapsed = Math.max(0.5, Math.min(3, currentMonth - i * 3));
              const projected = (q.actual / monthsElapsed) * 3;
              const badge = usedPct > 100
                ? { label: "Exceeded", bg: "#FEE2E2", color: "#DC2626" }
                : statusBadge(usedPct);
              return (
                <div key={i} style={{ background: "#F4F9F0", borderRadius: 14, padding: 16, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1A2E1A", marginBottom: 8 }}>{q.label}</div>
                  <ProgressRing size={80} pct={usedPct} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>Budget: {q.budget.toFixed(1)}t</div>
                  <div style={{ marginTop: 6 }}>
                    <label style={{ fontSize: 10, color: "#64748B" }}>Actual</label>
                    <input
                      type="number"
                      value={q.actual}
                      onChange={(e) => updateQuarter(i, e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12, textAlign: "center" }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>Projected: {projected.toFixed(1)}t</div>
                  <span style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Monthly chart */}
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChart} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: "tonnes", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <ReferenceLine y={monthlyBudget} stroke="#97BC62" strokeDasharray="6 4" label={{ value: "Budget", position: "right", style: { fontSize: 10, fill: "#2C5F2D" } }} />
                <Bar dataKey="actual" fill="#1A2E1A" radius={[4, 4, 0, 0]} name="Actual Emissions" />
                <Line type="monotone" dataKey="budget" stroke="#97BC62" strokeDasharray="6 4" strokeWidth={2} dot={false} name="Monthly Budget" />
                {monthlyChart.map((d, i) =>
                  d.actual > d.budget ? (
                    <ReferenceLine key={`over-${i}`} x={d.month} stroke="none" />
                  ) : null
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          SECTION 4 — Budget Intelligence
         ═══════════════════════════════════════════════ */}
      {budgetCreated && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {/* Card 1 — AI Budget Analysis */}
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ background: "#1A2E1A", padding: "14px 20px" }}>
                <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>🤖 AI Budget Analysis</h3>
              </div>
              <div style={{ padding: 20 }}>
                {!aiAnalysis && !aiLoading && (
                  <button
                    onClick={generateAnalysis}
                    style={{
                      width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, #97BC62, #2C5F2D)", color: "#fff",
                      fontWeight: 700, fontSize: 13, cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(44,95,45,0.25)",
                    }}
                  >
                    Generate Analysis
                  </button>
                )}
                {aiLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748B" }}>
                    <div className="h-4 w-4 border-2 border-accentLime border-t-transparent rounded-full animate-spin" />
                    Analyzing budget data...
                  </div>
                )}
                {aiAnalysis && (
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: "#334155", maxHeight: 280, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                    {aiAnalysis}
                  </div>
                )}
              </div>
            </div>

            {/* Card 2 — Automated Alerts */}
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ background: "#1A2E1A", padding: "14px 20px" }}>
                <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>⚠️ Automated Alerts</h3>
              </div>
              <div style={{ padding: 20, maxHeight: 340, overflowY: "auto" }}>
                {alerts.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#64748B", fontStyle: "italic" }}>No alerts at this time. Enter actual emissions data to trigger automated monitoring.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <AnimatePresence>
                      {alerts.map((a) => (
                        <motion.div
                          key={a.key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10,
                            padding: "10px 12px", borderRadius: 10,
                            borderLeft: `4px solid ${a.type === "red" ? "#DC2626" : a.type === "amber" ? "#D97706" : "#059669"}`,
                            background: a.type === "red" ? "#FEF2F2" : a.type === "amber" ? "#FFFBEB" : "#ECFDF5",
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{a.icon}</span>
                          <p style={{ flex: 1, fontSize: 11, color: "#334155", margin: 0, lineHeight: 1.5 }}>{a.text}</p>
                          <button
                            onClick={() => setDismissedAlerts((p) => [...p, a.key])}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                          >
                            ✕
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3 — Budget Summary */}
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ background: "#1A2E1A", padding: "14px 20px" }}>
                <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>📊 Budget Summary</h3>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ textAlign: "center", padding: 12, background: "#F4F9F0", borderRadius: 12 }}>
                    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Total Budgeted</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1A2E1A" }}>{totalBudget.toFixed(1)}<span style={{ fontSize: 12 }}>t</span></div>
                  </div>
                  <div style={{ textAlign: "center", padding: 12, background: "#F4F9F0", borderRadius: 12 }}>
                    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Total Actual</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1A2E1A" }}>{totalActual.toFixed(1)}<span style={{ fontSize: 12 }}>t</span></div>
                  </div>
                  <div style={{ textAlign: "center", padding: 12, background: variance >= 0 ? "#ECFDF5" : "#FEF2F2", borderRadius: 12 }}>
                    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Variance</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: variance >= 0 ? "#059669" : "#DC2626" }}>
                      {variance >= 0 ? "−" : "+"}{Math.abs(variance).toFixed(1)}<span style={{ fontSize: 12 }}>t</span>
                    </div>
                    <div style={{ fontSize: 10, color: variance >= 0 ? "#059669" : "#DC2626", fontWeight: 600 }}>
                      {Math.abs(variancePct).toFixed(0)}% {variance >= 0 ? "under" : "over"} budget
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: 12, background: "#F4F9F0", borderRadius: 12 }}>
                    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Projected Year End</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1A2E1A" }}>{projectedYearEnd.toFixed(1)}<span style={{ fontSize: 12 }}>t</span></div>
                    {(() => {
                      const b = projectedYearEnd <= totalBudget
                        ? { label: "On Track", bg: "#D1FAE5", color: "#059669" }
                        : { label: "Over Budget", bg: "#FEE2E2", color: "#DC2626" };
                      return (
                        <span style={{ display: "inline-block", marginTop: 4, padding: "2px 10px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: b.bg, color: b.color }}>
                          {b.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
