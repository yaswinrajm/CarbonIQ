import React from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useAppContext } from "../context";
import CarbonScoreGauge from "../components/CarbonScoreGauge";
import WhatIfSimulator from "../components/WhatIfSimulator";
import { normalizeEmployees } from "../utils/calculations";

const PIE_COLORS = ["#4A8C4B", "#22C55E", "#F59E0B", "#0EA5E9"];

const EU_COUNTRIES = new Set([
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
]);

export function Dashboard() {
  const { emissions, company, csvData } = useAppContext();

  const scopeData = [
    { name: "Scope 1", value: emissions.scope1 || 0 },
    { name: "Scope 2", value: emissions.scope2 || 0 },
    { name: "Scope 3", value: emissions.scope3 || 0 },
  ];

  const pieData = [
    { name: "Energy", value: emissions.byCategory?.energy || 0 },
    { name: "Transport", value: emissions.byCategory?.transport || 0 },
    { name: "Waste", value: emissions.byCategory?.waste || 0 },
    { name: "Water", value: emissions.byCategory?.water || 0 },
  ];

  const monthlyData =
    csvData?.map((row) => {
      const monthLabel = `${row.month?.slice(0, 3)} ${row.year}`;
      const kwh = row.electricity_kwh || 0;
      const gas = row.gas_m3 || 0;
      const flights = row.flights_hours || 0;
      const carKm = row.car_km || 0;
      const commute = row.commute_km_per_day || 0;
      const landfill = row.waste_landfill_kg || 0;
      const water = row.water_liters || 0;

      const scope1 =
        gas * 2.04 + carKm * 0.171;
      const scope2 = kwh * 0.233;
      const scope3 =
        flights * 255 +
        commute * 220 * 0.171 +
        landfill * 0.58 +
        water * 0.000344;

      const total = (scope1 + scope2 + scope3) / 1000;
      const industryAvg =
        (emissions.industryAveragePerEmployee || 10) *
        normalizeEmployees(company.employees || "200") /
        12;

      return {
        name: monthLabel,
        company: total,
        industry: industryAvg,
      };
    }) || [];

  const employees = normalizeEmployees(company.employees || "100");
  const perEmployee = emissions.perEmployee || 0;
  const industryPerEmployee = emissions.industryAveragePerEmployee || 0;
  const vsIndustry =
    industryPerEmployee > 0
      ? ((perEmployee - industryPerEmployee) / industryPerEmployee) * 100
      : 0;

  const projectedCost = emissions.projectedAnnualCost || 0;

  const peerData = [
    {
      label: "Bottom 25%",
      value: industryPerEmployee * 1.4,
      color: "#EF4444",
    },
    {
      label: "Industry average",
      value: industryPerEmployee,
      color: "#F59E0B",
    },
    {
      label: "Top 25%",
      value: industryPerEmployee * 0.6,
      color: "#22C55E",
    },
  ];

  const companyMarkerPosition =
    industryPerEmployee > 0 ? perEmployee / (industryPerEmployee * 2) : 0.5;

  const alerts = getRegulatoryAlerts(company, emissions, employees);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div
          className="card-premium lg:col-span-2 p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <CarbonScoreGauge score={emissions.carbonScore || 0} />
          <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
            <SummaryCard
              label="Total CO₂e"
              value={
                Number.isFinite(emissions.totalTonnes)
                  ? `${emissions.totalTonnes.toFixed(1)} t`
                  : "—"
              }
              helper={`${perEmployee.toFixed(2)} t / employee`}
            />
            <SummaryCard
              label="vs industry average"
              value={`${vsIndustry >= 0 ? "+" : ""}${vsIndustry.toFixed(1)}%`}
              helper={
                vsIndustry > 0
                  ? "Above peer intensity"
                  : "Below peer intensity"
              }
              tone={vsIndustry > 0 ? "danger" : "good"}
            />
            <SummaryCard
              label="Biggest source"
              value={emissions.biggestSource || "Not yet calculated"}
              helper="Primary decarbonization lever"
            />
            <SummaryCard
              label="Carbon price exposure"
              value={`$${projectedCost.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}`}
              helper="@ $50 / tonne"
            />
          </div>
        </motion.div>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <AlertCard key={alert.title} index={index} {...alert} />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div
          className="card-premium p-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="text-sm font-semibold text-textDark mb-2">
            Scope breakdown
          </h3>
          <p className="text-[11px] text-textGray mb-3">
            High-level view of Scope 1, 2 and 3 emissions (t CO₂e).
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scopeData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.18)",
                    padding: "8px 10px",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#4A8C4B"
                  radius={[6, 6, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div
          className="card-premium p-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
        >
          <h3 className="text-sm font-semibold text-textDark mb-2">
            Emissions by category
          </h3>
          <p className="text-[11px] text-textGray mb-3">
            Distribution across energy, transport, waste and water.
          </p>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.18)",
                    padding: "8px 10px",
                    fontSize: 11,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div
          className="card-premium p-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-textDark mb-2">
            Peer benchmarking
          </h3>
          <p className="text-[11px] text-textGray mb-4">
            Emissions intensity (t CO₂e / employee) vs your sector.
          </p>
          <div className="space-y-2 text-[11px]">
            {peerData.map((p) => (
              <div key={p.label} className="flex items-center gap-2">
                <div className="w-20 text-textGray">{p.label}</div>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "70%",
                      backgroundColor: p.color,
                    }}
                  />
                </div>
                <div className="w-12 text-right text-textDark">
                  {p.value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="relative h-6 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primaryDark"
                style={{
                  left: `${Math.min(100, Math.max(0, companyMarkerPosition * 100))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-textGray mt-1">
              <span>Low intensity</span>
              <span>Your org</span>
              <span>High intensity</span>
            </div>
          </div>
        </motion.div>
      </div>

      {monthlyData.length > 1 && (
        <motion.div
          className="card-premium p-4"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-textDark">
              Monthly trend (CSV-derived)
            </h3>
            <span className="text-[11px] text-textGray">
              Red dotted: industry average
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.18)",
                    padding: "8px 10px",
                    fontSize: 11,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="company"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={false}
                  name="Your org"
                />
                <Line
                  type="monotone"
                  dataKey="industry"
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                  name="Industry avg"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <WhatIfSimulator />
    </div>
  );
}

function SummaryCard({ label, value, helper, tone }) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "good"
      ? "text-good"
      : "text-textDark";

  return (
    <motion.div
      className="rounded-xl border border-slate-200 bg-lightBg px-3 py-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="text-[11px] text-textGray mb-0.5">{label}</div>
      <motion.div
        className={`text-xs font-semibold ${toneClass} tabular-nums`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {value}
      </motion.div>
      {helper && (
        <div className="text-[10px] text-textGray mt-0.5">{helper}</div>
      )}
    </motion.div>
  );
}

function AlertCard({ title, body, tone, index }) {
  const config = {
    danger: {
      bg: "bg-danger/5",
      border: "border-danger/40",
      text: "text-danger",
    },
    warning: {
      bg: "bg-warning/5",
      border: "border-warning/40",
      text: "text-warning",
    },
    info: {
      bg: "bg-accentLime/5",
      border: "border-accentLime/40",
      text: "text-mediumGreen",
    },
  }[tone || "info"];

  return (
    <motion.div
      className={`rounded-2xl border px-3 py-2.5 text-xs ${config.bg} ${config.border}`}
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.08 }}
    >
      <div className={`font-semibold ${config.text} mb-0.5`}>{title}</div>
      <div className="text-[11px] text-textGray">{body}</div>
    </motion.div>
  );
}

function getRegulatoryAlerts(company, emissions, employees) {
  const alerts = [];
  const total = emissions.totalTonnes || 0;
  const liability = total * 50;

  if (EU_COUNTRIES.has(company.country) && employees > 500) {
    alerts.push({
      title: "⚠️ CSRD compliance required",
      body: `As a ${company.industry} company in the EU with more than 500 employees, you fall within the scope of the Corporate Sustainability Reporting Directive. Current modelled emissions of ${total.toFixed(
        1
      )} t CO₂e may sit above emerging sectoral trajectories – prepare a robust plan to evidence reductions by 2025.`,
      tone: "warning",
    });
  }

  if (company.country === "United Kingdom") {
    const atRisk = employees >= 250;
    alerts.push({
      title: "⚠️ UK SECR requirements",
      body: `Large UK companies (${">=250"} employees) must disclose energy use and associated emissions under SECR. Based on ${
        employees
      } employees you are ${atRisk ? "AT RISK" : "likely COMPLIANT"} – ensure directors' reports include an auditable breakdown of Scope 1 and 2.`,
      tone: atRisk ? "warning" : "info",
    });
  }

  alerts.push({
    title: "💰 Carbon price exposure",
    body: `At an illustrative carbon price of $50 per tonne, your annual liability is approximately $${liability.toLocaleString(
      undefined,
      { maximumFractionDigits: 0 }
    )}. Early abatement can materially reduce this cost and de-risk future carbon price shocks.`,
    tone: total > 500 ? "danger" : "info",
  });

  return alerts;
}

export default Dashboard;

