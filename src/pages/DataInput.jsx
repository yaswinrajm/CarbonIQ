import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context";
import { calculateEmissions } from "../utils/calculations";
import { extractDataFromText, analyzeSupplyChain } from "../utils/geminiAPI";

const TABS = ["Energy", "Transport", "Waste & Water", "Supply Chain (Scope 3)", "CSV Upload"];

const DEMO_INPUT = {
  electricityKwh: 520000,
  naturalGasM3: 8500,
  renewablePercent: 35,
  officeLocations: 3,
  flightsHours: 920,
  fleetKm: 48000,
  commuteKmPerDay: 14,
  workingDays: 220,
  publicTransitPercent: 45,
  landfillKg: 9200,
  recycledKg: 6400,
  waterLiters: 980000,
  revenuePer1000: 250000,
};

// Maps Gemini JSON keys → rawInput form field keys
const AI_FIELD_MAP = {
  electricityKwh: { formKey: "electricityKwh", label: "Electricity", unit: "kWh" },
  gasM3:          { formKey: "naturalGasM3",   label: "Natural Gas", unit: "m³" },
  flightHours:    { formKey: "flightsHours",   label: "Flights",     unit: "hours" },
  carKm:          { formKey: "fleetKm",        label: "Vehicle Fleet", unit: "km" },
  commutingKmPerDay: { formKey: "commuteKmPerDay", label: "Commuting", unit: "km/day" },
  landfillKg:     { formKey: "landfillKg",     label: "Landfill Waste", unit: "kg" },
  recycledKg:     { formKey: "recycledKg",     label: "Recycled Waste", unit: "kg" },
  waterLiters:    { formKey: "waterLiters",    label: "Water",       unit: "litres" },
};

export function DataInput() {
  const navigate = useNavigate();
  const { company, setEmissions, rawInput, setRawInput, setCsvData } =
    useAppContext();
  const [activeTab, setActiveTab] = useState("Energy");
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvError, setCsvError] = useState("");

  // AI extraction state
  const [nlText, setNlText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [flashingFields, setFlashingFields] = useState(new Set());

  const input = { ...DEMO_INPUT, ...rawInput };

  const handleChange = (field) => (e) => {
    const value =
      e.target.type === "range" || e.target.type === "number"
        ? Number(e.target.value || 0)
        : e.target.value;
    setRawInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleDemo = () => {
    setRawInput(DEMO_INPUT);
  };

  // --- AI Extraction ---
  const handleExtract = useCallback(async () => {
    if (!nlText.trim()) return;
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    setFlashingFields(new Set());

    try {
      const data = await extractDataFromText(nlText);

      const entries = Object.entries(AI_FIELD_MAP)
        .map(([aiKey, meta]) => ({
          aiKey,
          ...meta,
          value: Number(data[aiKey]) || 0,
        }))
        .filter((e) => e.value > 0);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        await new Promise((r) => setTimeout(r, 150));
        setRawInput((prev) => ({ ...prev, [entry.formKey]: entry.value }));
        setFlashingFields((prev) => new Set(prev).add(entry.formKey));

        setTimeout(() => {
          setFlashingFields((prev) => {
            const next = new Set(prev);
            next.delete(entry.formKey);
            return next;
          });
        }, 600);
      }

      setAiResult({ entries, totalFilled: entries.length });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setAiError(
        "AI extraction failed. Please check your API key and try again."
      );
    } finally {
      setAiLoading(false);
    }
  }, [nlText, setRawInput]);

  const handleClearNl = () => {
    setNlText("");
    setAiResult(null);
    setAiError("");
  };

  const handleCsv = (file) => {
    if (!file) return;
    setCsvError("");
    window.Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        if (result.errors?.length) {
          setCsvError("Unable to parse CSV. Please check the template.");
          return;
        }
        const rows = result.data.filter((r) => r.month && r.year);
        setCsvPreview(rows.slice(0, 5));
        setCsvData(rows);
      },
      error: () => {
        setCsvError("Unable to parse CSV. Please try again.");
      },
    });
  };

  const handleCalculate = () => {
    const computed = calculateEmissions(input, company);
    setEmissions({
      ...computed,
      monthly: [],
    });
    navigate("/dashboard");
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* ── Page Title with AI-Powered badge ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-textDark inline-flex items-center gap-2">
            Input your activity data
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: "#97BC6220", color: "#97BC62" }}>
              ✨ AI-Powered
            </span>
          </h2>
          <p className="text-xs md:text-sm text-textGray">
            Capture key drivers of your footprint. Use demo mode for an
            instant, fully-populated walkthrough.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDemo}
          className="inline-flex items-center gap-2 text-xs md:text-sm rounded-full border border-accentLime/70 px-3 py-1.5 bg-white hover:bg-lightBg text-primaryDark font-semibold"
        >
          Use sample demo data
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          AI Natural Language Data Entry Card
         ═══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-5 md:p-6 shadow-lg"
        style={{
          background: "linear-gradient(135deg, #2C5F2D 0%, #1A2E1A 100%)",
        }}
      >
        <h3 className="text-white font-bold text-base md:text-lg mb-1">
          🧠 AI Data Extraction — Just Describe Your Usage
        </h3>
        <p className="text-emerald-200/70 text-xs mb-4">
          Paste a utility bill, a paragraph from a sustainability report, or
          simply describe your numbers in everyday language.
        </p>

        <textarea
          value={nlText}
          onChange={(e) => setNlText(e.target.value)}
          rows={5}
          placeholder={`Paste your utility bill details or just describe your usage in plain English. For example: Our office used around 45,000 kWh of electricity and 1,200 cubic meters of gas last year. We took about 200 hours of business flights and our fleet drove 85,000 km. We send roughly 800 kg to landfill monthly and recycle about 400 kg.`}
          className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/40 px-4 py-3 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-accentLime/60 resize-none"
        />

        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            onClick={handleExtract}
            disabled={aiLoading || !nlText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#97BC62",
              color: "#1A2E1A",
            }}
          >
            {aiLoading ? (
              <>
                <span className="h-4 w-4 border-2 border-[#1A2E1A] border-t-transparent rounded-full animate-spin" />
                AI is reading your data…
              </>
            ) : (
              "Extract with AI"
            )}
          </button>
          <button
            type="button"
            onClick={handleClearNl}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 border border-white/20 hover:bg-white/10 transition-colors"
          >
            Clear
          </button>
        </div>

        <AnimatePresence>
          {aiError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-xs bg-red-500/20 border border-red-400/40 text-red-200 rounded-xl px-3 py-2"
            >
              {aiError}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {aiResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-900/40 backdrop-blur-sm p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-emerald-300">
                  ✅ {aiResult.totalFilled} field{aiResult.totalFilled !== 1 ? "s" : ""} auto-filled
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Detected:{" "}
                {aiResult.entries
                  .map(
                    (e) =>
                      `${e.label} ${e.value.toLocaleString()} ${e.unit}`
                  )
                  .join(", ")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Tab panel ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 ${
                activeTab === tab
                  ? "border-accentLime text-primaryDark bg-lightBg"
                  : "border-transparent text-textGray hover:text-textDark"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-4 md:p-6">
          {activeTab === "Energy" && (
            <EnergyTab input={input} onChange={handleChange} flashingFields={flashingFields} />
          )}
          {activeTab === "Transport" && (
            <TransportTab input={input} onChange={handleChange} flashingFields={flashingFields} />
          )}
          {activeTab === "Waste & Water" && (
            <WasteWaterTab input={input} onChange={handleChange} flashingFields={flashingFields} />
          )}
          {activeTab === "Supply Chain (Scope 3)" && (
            <SupplyChainTab />
          )}
          {activeTab === "CSV Upload" && (
            <CsvTab
              onFile={handleCsv}
              csvPreview={csvPreview}
              csvError={csvError}
            />
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCalculate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mediumGreen text-white text-sm font-semibold shadow-sm hover:bg-forest"
        >
          Calculate footprint & view dashboard
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Shared Field component with lime flash animation
   ───────────────────────────────────────────────────────── */
function Field({ label, suffix, fieldKey, flashingFields, ...rest }) {
  const isFlashing = flashingFields && flashingFields.has(fieldKey);

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-textGray">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          {...rest}
          className={`w-full rounded-lg border px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-accentLime bg-white transition-all duration-300 ${
            isFlashing
              ? "border-accentLime ring-2 ring-accentLime/50 bg-accentLime/10 shadow-[0_0_12px_rgba(151,188,98,0.35)]"
              : "border-slate-200"
          }`}
        />
        {suffix && (
          <span className="text-[11px] md:text-xs text-textGray">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function EnergyTab({ input, onChange, flashingFields }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="Electricity consumption" suffix="kWh / year" type="number" value={input.electricityKwh} onChange={onChange("electricityKwh")} fieldKey="electricityKwh" flashingFields={flashingFields} />
      <Field label="Natural gas consumption" suffix="m³ / year" type="number" value={input.naturalGasM3} onChange={onChange("naturalGasM3")} fieldKey="naturalGasM3" flashingFields={flashingFields} />
      <div>
        <label className="block text-xs font-medium text-textGray mb-1">Renewable energy percentage</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} value={input.renewablePercent} onChange={onChange("renewablePercent")} className="flex-1 accent-accentLime" />
          <span className="text-xs font-semibold text-accentLime w-10">{input.renewablePercent}%</span>
        </div>
      </div>
      <Field label="Number of office locations" type="number" value={input.officeLocations} onChange={onChange("officeLocations")} fieldKey="officeLocations" flashingFields={flashingFields} />
    </div>
  );
}

function TransportTab({ input, onChange, flashingFields }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="Business flights" suffix="hours / year" type="number" value={input.flightsHours} onChange={onChange("flightsHours")} fieldKey="flightsHours" flashingFields={flashingFields} />
      <Field label="Company vehicle fleet" suffix="km / year" type="number" value={input.fleetKm} onChange={onChange("fleetKm")} fieldKey="fleetKm" flashingFields={flashingFields} />
      <Field label="Employee commuting" suffix="avg km / day" type="number" value={input.commuteKmPerDay} onChange={onChange("commuteKmPerDay")} fieldKey="commuteKmPerDay" flashingFields={flashingFields} />
      <div>
        <Field label="Working days per year" type="number" value={input.workingDays} onChange={onChange("workingDays")} fieldKey="workingDays" flashingFields={flashingFields} />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-textGray mb-1">Public transit usage</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} value={input.publicTransitPercent} onChange={onChange("publicTransitPercent")} className="flex-1 accent-accentLime" />
          <span className="text-xs font-semibold text-accentLime w-10">{input.publicTransitPercent}%</span>
        </div>
      </div>
    </div>
  );
}

function WasteWaterTab({ input, onChange, flashingFields }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="Waste sent to landfill" suffix="kg / year" type="number" value={input.landfillKg} onChange={onChange("landfillKg")} fieldKey="landfillKg" flashingFields={flashingFields} />
      <Field label="Waste recycled" suffix="kg / year" type="number" value={input.recycledKg} onChange={onChange("recycledKg")} fieldKey="recycledKg" flashingFields={flashingFields} />
      <Field label="Water consumption" suffix="litres / year" type="number" value={input.waterLiters} onChange={onChange("waterLiters")} fieldKey="waterLiters" flashingFields={flashingFields} />
      <Field label="Revenue" suffix="£ / 1000" type="number" value={input.revenuePer1000} onChange={onChange("revenuePer1000")} fieldKey="revenuePer1000" flashingFields={flashingFields} />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SUPPLY CHAIN (SCOPE 3) TAB — Spend-based EEIO estimator
   ═════════════════════════════════════════════════════════════ */

const SUPPLY_CATEGORIES = [
  "IT Equipment & Software",
  "Business Travel & Hotels",
  "Food & Catering",
  "Office Supplies & Furniture",
  "Marketing & Print",
  "Logistics & Freight",
  "Construction & Facilities",
  "Professional Services",
  "Raw Materials",
  "Energy Products",
];

// EEIO emission factors: tonnes CO₂e per $1 000 spent
const EEIO_FACTORS = {
  "IT Equipment & Software":     0.42,
  "Business Travel & Hotels":    0.52,
  "Food & Catering":             0.89,
  "Office Supplies & Furniture": 0.31,
  "Marketing & Print":           0.28,
  "Logistics & Freight":         0.95,
  "Construction & Facilities":   0.67,
  "Professional Services":       0.18,
  "Raw Materials":               1.24,
  "Energy Products":             0.78,
};

function makeRow(category = SUPPLY_CATEGORIES[0]) {
  return { id: Date.now() + Math.random(), category, spend: 0 };
}

/* Typewriter hook — reveals text character by character */
function useTypewriter(text, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    if (!text) { setDisplayed(""); idx.current = 0; return; }
    setDisplayed("");
    idx.current = 0;
    const timer = setInterval(() => {
      idx.current += 1;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return displayed;
}

function SupplyChainTab() {
  const { emissions, company } = useAppContext();
  const [rows, setRows] = useState(() =>
    SUPPLY_CATEGORIES.slice(0, 5).map((c) => makeRow(c))
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  const typedText = useTypewriter(aiText);

  // Computed emissions per row
  const enrichedRows = rows.map((r) => {
    const factor = EEIO_FACTORS[r.category] || 0;
    const co2e = (r.spend / 1000) * factor;
    return { ...r, factor, co2e };
  });

  const totalScope3 = enrichedRows.reduce((s, r) => s + r.co2e, 0);
  const companyTotal = (emissions.totalTonnes || 0) + totalScope3;
  const pctOfTotal = companyTotal > 0 ? (totalScope3 / companyTotal) * 100 : 0;

  // Top 3 highest-emission categories
  const sorted = [...enrichedRows].filter((r) => r.co2e > 0).sort((a, b) => b.co2e - a.co2e);
  const top3Ids = new Set(sorted.slice(0, 3).map((r) => r.id));

  const handleSpendChange = (id) => (e) => {
    const val = Number(e.target.value) || 0;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, spend: val } : r)));
  };

  const handleCategoryChange = (id) => (e) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, category: e.target.value } : r)));
  };

  const addRow = () => {
    const used = new Set(rows.map((r) => r.category));
    const next = SUPPLY_CATEGORIES.find((c) => !used.has(c)) || SUPPLY_CATEGORIES[0];
    setRows((prev) => [...prev, makeRow(next)]);
  };

  const removeRow = (id) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAnalyze = async () => {
    setAiLoading(true);
    setAiError("");
    setAiText("");
    try {
      const result = await analyzeSupplyChain(enrichedRows, company);
      setAiText(result);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setAiError("AI analysis failed. Please check your API key and try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header explainer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs md:text-sm text-textDark leading-relaxed">
          <span className="font-semibold">Scope 3 emissions from your supply chain are typically 70% of a company's total footprint.</span>{" "}
          Enter your annual spending by category and we estimate the associated emissions using EEIO emission factors.
        </p>
      </div>

      {/* Spending rows */}
      <div className="space-y-3">
        {/* Header row */}
        <div className="hidden md:grid md:grid-cols-12 gap-3 text-[11px] font-medium text-textGray uppercase tracking-wider px-1">
          <div className="col-span-4">Category</div>
          <div className="col-span-3">Annual Spend (USD)</div>
          <div className="col-span-2">Factor</div>
          <div className="col-span-2">CO₂e</div>
          <div className="col-span-1"></div>
        </div>

        <AnimatePresence initial={false}>
          {enrichedRows.map((row) => {
            const isTop3 = top3Ids.has(row.id);
            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-xl border px-3 py-2.5 transition-colors ${
                  isTop3
                    ? "border-amber-300 bg-amber-50/60"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* Category */}
                <div className="md:col-span-4">
                  <select
                    value={row.category}
                    onChange={handleCategoryChange(row.id)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accentLime"
                  >
                    {SUPPLY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Spend */}
                <div className="md:col-span-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-textGray">$</span>
                    <input
                      type="number"
                      min={0}
                      value={row.spend || ""}
                      onChange={handleSpendChange(row.id)}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-accentLime bg-white"
                    />
                  </div>
                </div>

                {/* Factor */}
                <div className="md:col-span-2 text-[11px] md:text-xs text-textGray">
                  {(row.factor * 1000).toFixed(0)} kg CO₂e / $1 000
                </div>

                {/* CO₂e */}
                <div className="md:col-span-2">
                  <span className={`text-xs md:text-sm font-semibold ${row.co2e > 0 ? "text-good" : "text-textGray"}`}>
                    {row.co2e > 0 ? `${row.co2e.toFixed(2)} t` : "—"}
                  </span>
                  {isTop3 && row.co2e > 0 && (
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-200/70 text-amber-800">
                      TOP
                    </span>
                  )}
                </div>

                {/* Remove */}
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="text-[11px] text-textGray hover:text-danger disabled:opacity-30 transition-colors"
                  >
                    ✕ Remove
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accentLime hover:text-mediumGreen transition-colors"
        >
          <span className="text-base leading-none">+</span> Add Category
        </button>
      </div>

      {/* ── Summary Card ── */}
      <motion.div
        className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-textGray mb-1">
              Total Scope 3 Supply Chain Emissions
            </div>
            <div className="text-2xl md:text-3xl font-bold text-textDark tabular-nums">
              {totalScope3.toFixed(2)}{" "}
              <span className="text-base font-semibold text-textGray">t CO₂e</span>
            </div>
            <div className="text-xs text-textGray mt-1">
              {pctOfTotal > 0
                ? `${pctOfTotal.toFixed(1)}% of total company footprint (incl. Scope 1–2)`
                : "Enter spending data above to calculate"}
            </div>

            {sorted.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sorted.slice(0, 3).map((r, i) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    #{i + 1} {r.category} • {r.co2e.toFixed(1)} t
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={aiLoading || totalScope3 <= 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            style={{ backgroundColor: "#97BC62", color: "#1A2E1A" }}
          >
            {aiLoading ? (
              <>
                <span className="h-4 w-4 border-2 border-[#1A2E1A] border-t-transparent rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              "🔍 Analyze Supply Chain with AI"
            )}
          </button>
        </div>
      </motion.div>

      {/* AI Error */}
      <AnimatePresence>
        {aiError && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-danger bg-danger/5 border border-danger/30 rounded-xl px-4 py-3"
          >
            {aiError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Recommendations — Typewriter */}
      <AnimatePresence>
        {(aiText || aiLoading) && !aiError && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="rounded-2xl border border-accentLime/30 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm"
          >
            <h4 className="text-sm font-semibold text-textDark mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accentLime animate-pulse" />
              AI Supplier Engagement Recommendations
            </h4>
            <div className="text-xs md:text-sm text-textDark leading-relaxed whitespace-pre-wrap">
              {aiLoading && !aiText ? (
                <span className="text-textGray italic">Generating recommendations...</span>
              ) : (
                <>
                  {typedText}
                  {typedText.length < aiText.length && (
                    <span className="inline-block w-0.5 h-4 bg-accentLime animate-pulse ml-0.5 align-middle" />
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CSV Tab
   ───────────────────────────────────────────────────────── */
function CsvTab({ onFile, csvPreview, csvError }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    onFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    onFile(file);
  };

  const prevent = (e) => e.preventDefault();

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-lightBg/60"
        onDrop={handleDrop}
        onDragOver={prevent}
        onDragEnter={prevent}
      >
        <p className="text-sm font-medium text-textDark mb-1">
          Drag & drop CSV here
        </p>
        <p className="text-xs text-textGray mb-3">
          Or click below to select a file. CarbonIQ will auto-map columns to
          your data model.
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="text-xs"
        />
        <a
          href="/sample_data.csv"
          download
          className="mt-3 inline-flex items-center gap-1 text-xs text-accentLime hover:underline"
        >
          Download sample CSV template
        </a>
      </div>
      {csvError && (
        <div className="text-xs text-danger bg-danger/5 border border-danger/30 rounded-lg px-3 py-2">
          {csvError}
        </div>
      )}
      {csvPreview && csvPreview.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 text-xs font-medium text-textGray bg-slate-50">
            Preview (first 5 rows)
          </div>
          <div className="overflow-auto max-h-60 text-[11px]">
            <table className="min-w-full border-t border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {Object.keys(csvPreview[0]).map((key) => (
                    <th
                      key={key}
                      className="px-2 py-1 text-left font-medium text-textGray border-b border-slate-200"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((row, idx) => (
                  <tr key={idx} className="even:bg-slate-50/40">
                    {Object.keys(csvPreview[0]).map((key) => (
                      <td
                        key={key}
                        className="px-2 py-1 border-b border-slate-100 text-textDark"
                      >
                        {row[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataInput;
