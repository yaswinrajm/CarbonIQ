import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAppContext } from "../context";
import { getInstantSnapshot, checkCompanyRecognition, getIndustryEstimate } from "../utils/geminiAPI";
import Logo from "../components/Logo";

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */
function employeeBucket(count) {
  if (count <= 50) return "1-50";
  if (count <= 200) return "51-200";
  if (count <= 500) return "201-500";
  if (count <= 2000) return "501-2000";
  return "2000+";
}

function gradeColor(grade) {
  if (grade === "A") return "#059669";
  if (grade === "B") return "#97BC62";
  if (grade === "C") return "#D97706";
  if (grade === "D") return "#EA580C";
  return "#DC2626";
}

function riskColor(risk) {
  if (risk === "Low") return "#059669";
  if (risk === "Medium") return "#D97706";
  return "#DC2626";
}

function riskBg(risk) {
  if (risk === "Low") return "#d1fae5";
  if (risk === "Medium") return "#fef3c7";
  return "#fee2e2";
}

function confidenceColor(c) {
  if (c === "High") return { bg: "#d1fae5", text: "#059669" };
  if (c === "Medium") return { bg: "#fef3c7", text: "#d97706" };
  return { bg: "#fee2e2", text: "#dc2626" };
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
export default function CarbonSnapshot() {
  const navigate = useNavigate();
  const { setCompany } = useAppContext();

  const [phase, setPhase] = useState("choice"); // choice | loading | results | limited_data
  const [showSearch, setShowSearch] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleSnapshot = useCallback(async () => {
    const name = companyName.trim();
    if (!name) return;

    setPhase("loading");
    setLoadingProgress(10);
    setLoadingMessage(`🔍 Checking public records for ${name}...`);
    setError("");

    try {
      await sleep(1000); // UI visual beat
      const recog = await checkCompanyRecognition(name);
      setLoadingProgress(30);

      if (recog.isKnown && (recog.confidence === "High" || recog.confidence === "Medium")) {
        // Known Company -> Full Snapshot
        setLoadingMessage(`📊 Found ${recog.companyFullName}. Extracting Scope 1-3 data...`);
        await sleep(1000);
        setLoadingProgress(60);
        
        setLoadingMessage("🧮 Calculating emissions & regulatory exposure...");
        const data = await getInstantSnapshot(name);
        setLoadingProgress(90);
        await sleep(1000);

        setLoadingMessage("✅ Your carbon snapshot is ready.");
        setSnapshot({ ...data, companyName: recog.companyFullName || data.companyName });
        setLoadingProgress(100);
        await sleep(600);
        
        setPhase("results");
      } else {
        // Unknown Company -> Limited Data Estimate
        setLoadingMessage(`⚠️ Limited public data for ${recog.companyFullName || name}.`);
        await sleep(1500);
        setLoadingProgress(50);
        
        setLoadingMessage(`📊 Generating industry average estimates...`);
        const estData = await getIndustryEstimate(name);
        setLoadingProgress(80);
        await sleep(1000);

        setLoadingMessage("✅ Estimates ready.");
        setEstimate({
          ...estData,
          companyName: recog.companyFullName || name,
          industry: recog.industry || estData.estimatedIndustry,
          approximateEmployees: recog.approximateEmployees || 50,
          country: recog.country || "Unknown",
        });
        setLoadingProgress(100);
        await sleep(600);
        
        setPhase("limited_data");
      }
    } catch (err) {
      setError("Failed to generate snapshot. Please try again.");
      setPhase("choice");
    }
  }, [companyName]);

  const prefillAndNavigate = (dataObj) => {
    if (dataObj) {
      setCompany({
        name: dataObj.companyName || companyName,
        industry: dataObj.industry || "Technology",
        employees: employeeBucket(dataObj.employeeCount || dataObj.approximateEmployees || 50),
        country: dataObj.country || "United Kingdom",
        year: "2024",
      });
    }
    navigate("/onboarding", { state: { prefilled: true } });
  };

  const handleTryAnother = () => {
    setPhase("choice");
    setShowSearch(false);
    setCompanyName("");
    setSnapshot(null);
    setEstimate(null);
    setError("");
  };

  const handleShare = () => {
    const slug = ((snapshot || estimate)?.companyName || companyName).toLowerCase().replace(/\s+/g, "-");
    navigator.clipboard.writeText(`https://carboniq.app/snapshot/${slug}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSnapshot();
  };

  /* ══════════════════════════════════════
     PHASE: CHOICE (Landing)
     ══════════════════════════════════════ */
  if (phase === "choice") {
    return (
      <div style={{
        minHeight: "100vh", background: "#1A2E1A", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 20px",
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, overflowY: "auto"
      }}>
        <div style={{ maxWidth: 700, width: "100%", margin: "auto" }}>
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <Logo size="large" />
          </motion.div>

          {/* Heading */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ color: "#fff", fontSize: 28, fontFamily: "Georgia, serif", fontWeight: 700, textAlign: "center", marginBottom: 32 }}>
            How would you like to get started?
          </motion.h1>

          {/* Two Cards */}
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: showSearch ? 32 : 0 }}>
            
            {/* Left Card: Instant Snapshot */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowSearch(true)}
              style={{
                width: 320, background: "#2C5F2D", borderTop: "4px solid #97BC62", borderRadius: 12, padding: "32px 24px",
                cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", position: "relative"
              }}
            >
              <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 8px 0" }}>🔍 Instant Snapshot</h2>
              <p style={{ color: "#97BC62", fontSize: 14, fontWeight: 600, margin: "0 0 16px 0" }}>I represent a well-known public company</p>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px 0" }}>Get an AI-estimated carbon footprint in 10 seconds using publicly available sustainability data.</p>
              <ul style={{ color: "#cbd5e1", fontSize: 12, margin: "0 0 32px 0", padding: 0, listStyle: "none", lineHeight: 1.8 }}>
                <li>✓ No data entry needed</li>
                <li>✓ Instant results</li>
                <li>✓ Based on public reports</li>
              </ul>
              <div style={{ marginTop: "auto", display: "inline-block", padding: "6px 14px", background: "rgba(151,188,98,0.2)", color: "#97BC62", borderRadius: 20, fontSize: 11, fontWeight: 700, alignSelf: "flex-start" }}>
                Best for: Listed & public companies
              </div>
            </motion.div>

            {/* Right Card: Full Analysis */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => prefillAndNavigate(null)}
              style={{
                width: 320, background: "#fff", borderTop: "4px solid #1A2E1A", borderRadius: 12, padding: "32px 24px",
                cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column"
              }}
            >
              <h2 style={{ color: "#1A2E1A", fontSize: 20, fontWeight: 800, margin: "0 0 8px 0" }}>📝 Full Analysis</h2>
              <p style={{ color: "#2C5F2D", fontSize: 14, fontWeight: 600, margin: "0 0 16px 0" }}>I want precise verified results</p>
              <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px 0" }}>Enter your actual operational data for an accurate audit-ready carbon footprint calculation.</p>
              <ul style={{ color: "#64748B", fontSize: 12, margin: "0 0 32px 0", padding: 0, listStyle: "none", lineHeight: 1.8 }}>
                <li>✓ CSRD & GHG Protocol compliant</li>
                <li>✓ Audit-ready results</li>
                <li>✓ Works for any organization</li>
              </ul>
              <div style={{ marginTop: "auto", display: "inline-block", padding: "6px 14px", background: "#f1f5f9", color: "#1A2E1A", borderRadius: 20, fontSize: 11, fontWeight: 700, alignSelf: "flex-start" }}>
                Best for: Any organization
              </div>
            </motion.div>

          </div>

          {/* Expanded Search Input */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0 }}
                style={{ display: "flex", maxWidth: 664, width: "100%", margin: "0 auto", boxShadow: "0 12px 40px rgba(0,0,0,0.4)", borderRadius: 12, overflow: "hidden" }}
              >
                <input
                  value={companyName} onChange={(e) => setCompanyName(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Enter company name — e.g. Infosys, Tata, Apple..." autoFocus
                  style={{ flex: 1, padding: "20px 24px", fontSize: 18, border: "none", outline: "none", background: "#fff", color: "#1A2E1A", fontWeight: 500 }}
                />
                <button
                  onClick={handleSnapshot} disabled={!companyName.trim()}
                  style={{ padding: "20px 32px", border: "none", whiteSpace: "nowrap", background: "linear-gradient(135deg, #97BC62, #84CC16)", color: "#1A2E1A", fontSize: 16, fontWeight: 800, cursor: companyName.trim() ? "pointer" : "not-allowed", transition: "all 0.2s" }}
                >
                  Instant Snapshot →
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <div style={{ color: "#f87171", fontSize: 13, marginTop: 16, textAlign: "center" }}>{error}</div>}
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════
     PHASE: LOADING
     ══════════════════════════════════════ */
  if (phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#1A2E1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
        {/* Pulsing logo */}
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.5 }} style={{ marginBottom: 40 }}>
          <Logo size="large" />
        </motion.div>
        {/* Step text */}
        <AnimatePresence mode="wait">
          <motion.div key={loadingMessage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} style={{ color: "#fff", fontSize: 18, fontWeight: 600, textAlign: "center", minHeight: 30 }}>
            {loadingMessage}
          </motion.div>
        </AnimatePresence>
        {/* Progress bar */}
        <div style={{ width: 300, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginTop: 32, overflow: "hidden" }}>
          <motion.div animate={{ width: `${loadingProgress}%` }} transition={{ duration: 0.5 }} style={{ height: "100%", background: "#97BC62", borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════
     PHASE: LIMITED DATA (Estimates)
     ══════════════════════════════════════ */
  if (phase === "limited_data") {
    const e = estimate;
    if (!e) return null;

    return (
      <div style={{ background: "#F4F9F0", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
        
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1A2E1A 0%, #2C5F2D 100%)", padding: "36px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: 36, fontWeight: 800, margin: 0 }}>{e.companyName}</h1>
            <p style={{ color: "#97BC62", fontSize: 14, marginTop: 4 }}>{e.industry} · {e.country}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#e2e8f0", color: "#475569" }}>
              Limited Public Data
            </span>
            <button onClick={handleShare} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {copied ? "Copied! ✅" : "📤 Share"}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px" }}>
          {/* Warning Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "#FFFBEB", border: "1px solid #FEF3C7", borderLeft: "4px solid #D97706", padding: "16px 20px", borderRadius: 8, color: "#92400e", fontSize: 14, fontWeight: 600, marginBottom: 32 }}>
            ⚠️ We found limited public sustainability data for {e.companyName} — this is common for private companies, startups, and regional organizations.
          </motion.div>

          {/* Industry Estimate Range Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1A2E1A", marginBottom: 32, textAlign: "center" }}>
              Based on your industry, similar organizations typically emit between <span style={{ color: "#2C5F2D" }}>{e.lowEstimateTonnes.toLocaleString()}</span> and <span style={{ color: "#D97706" }}>{e.highEstimateTonnes.toLocaleString()}</span> tonnes CO₂e annually
            </h2>
            
            {/* Range visualization */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
              <div style={{ width: 80, textAlign: "right", fontSize: 14, fontWeight: 700, color: "#059669" }}>{e.lowEstimateTonnes.toLocaleString()} t</div>
              <div style={{ flex: 1, height: 16, borderRadius: 8, background: "linear-gradient(90deg, #d1fae5 0%, #fef3c7 100%)", position: "relative", border: "1px solid #e2e8f0" }}></div>
              <div style={{ width: 80, textAlign: "left", fontSize: 14, fontWeight: 700, color: "#D97706" }}>{e.highEstimateTonnes.toLocaleString()} t</div>
            </div>

            {/* Typical Features */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Biggest Emission Source</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2E1A" }}>{e.typicalBiggestSource}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Typical Regulatory Exposure</div>
                <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800, background: riskBg(e.typicalRegulatoryRisk), color: riskColor(e.typicalRegulatoryRisk) }}>{e.typicalRegulatoryRisk} Risk</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Est. Employee Range</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2E1A" }}>{e.employeeRangeGuess} individuals</div>
              </div>
            </div>
          </motion.div>

          {/* CTA Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: "linear-gradient(135deg, #97BC62, #84CC16)", borderRadius: 16, padding: "32px 40px", textAlign: "center", boxShadow: "0 8px 32px rgba(151,188,98,0.35)" }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#1A2E1A", margin: "0 0 12px 0" }}>🎯 Get Your Exact Carbon Footprint</h3>
            <p style={{ fontSize: 15, color: "#1A2E1A", opacity: 0.9, margin: "0 auto 24px auto", maxWidth: 600, lineHeight: 1.5 }}>
              Your precise emissions could be anywhere in this range — run a Full Analysis with your actual data to get an audit-ready verified result in minutes.
            </p>
            <button
              onClick={() => prefillAndNavigate(e)}
              style={{ padding: "16px 40px", borderRadius: 12, border: "none", background: "#1A2E1A", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(26,46,26,0.3)", transition: "transform 0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.03)"} onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              Start Full Analysis →
            </button>
          </motion.div>

          {/* Try another */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button onClick={handleTryAnother} style={{ color: "#2C5F2D", fontSize: 13, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}>
              ← Navigate to options
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════
     PHASE: RESULTS (Full Snapshot)
     ══════════════════════════════════════ */
  const s = snapshot;
  if (!s) return null;

  const pieData = [
    { name: "Scope 1", value: s.scope1Tonnes || 0 },
    { name: "Scope 2", value: s.scope2Tonnes || 0 },
    { name: "Scope 3", value: s.scope3Tonnes || 0 },
  ];
  const COLORS = ["#2C5F2D", "#4A8C4B", "#97BC62"];
  const conf = confidenceColor(s.dataConfidence);
  const vsArrowDown = s.vsIndustryAverage?.toLowerCase().includes("below");

  return (
    <div style={{ background: "#F4F9F0", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* ── Hero Header ── */}
      <div style={{ background: "linear-gradient(135deg, #1A2E1A 0%, #2C5F2D 100%)", padding: "36px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 36, fontWeight: 800, margin: 0 }}>{s.companyName}</h1>
          <p style={{ color: "#97BC62", fontSize: 14, marginTop: 4 }}>{s.industry} · {s.country}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span title={`Based on ${s.dataSource}`} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: conf.bg, color: conf.text, cursor: "help" }}>
            {s.dataConfidence} Confidence
          </span>
          <button onClick={handleShare} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {copied ? "Copied! ✅" : "📤 Share Snapshot"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 60px" }}>
        
        {/* ── Confidence Transparency Banner ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: conf.bg, color: conf.text, padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, marginBottom: 24, border: `1px solid ${conf.text}33` }}>
          {s.dataConfidence === "High" && `✅ High Confidence — Based on ${s.dataSource}. This company has publicly disclosed sustainability data.`}
          {s.dataConfidence === "Medium" && `⚠️ Medium Confidence — Based on industry estimates and partial public data. Figures are indicative.`}
          {s.dataConfidence === "Low" && `🔴 Estimated Data — No direct public disclosure found. Figures based on industry averages for similar companies.`}
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, fontStyle: "italic", fontWeight: 500 }}>
            <span onClick={() => prefillAndNavigate(s)} style={{ cursor: "pointer", textDecoration: "underline" }}>For a verified audit-ready carbon report that meets CSRD and GHG Protocol standards, run your Full Analysis →</span>
          </div>
        </motion.div>

        {/* ── Hero Metrics Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Carbon Score", value: <div style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${gradeColor(s.carbonScore)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: gradeColor(s.carbonScore), margin: "0 auto 4px" }}>{s.carbonScore}</div>, sub: `Score: ${s.carbonScoreNumeric}/100` },
            { label: "Total Footprint", value: <div style={{ fontSize: 28, fontWeight: 800, color: "#1A2E1A" }}>{(s.totalTonnes || 0).toLocaleString()}</div>, sub: "tonnes CO₂e annually" },
            { label: "vs Industry", value: <div style={{ fontSize: 22, fontWeight: 800, color: vsArrowDown ? "#059669" : "#DC2626" }}>{vsArrowDown ? "▼" : "▲"} {s.vsIndustryAverage}</div>, sub: vsArrowDown ? "Below average" : "Above average" },
            { label: "Biggest Source", value: <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2E1A" }}>{s.biggestSource || "Energy"}</div>, sub: "Highest emission category" },
            { label: "💰 Tax Exposure", value: <div style={{ fontSize: 22, fontWeight: 800, color: "#D97706" }}>${(s.estimatedCarbonTaxLiability || 0).toLocaleString()}</div>, sub: "Estimated annual liability" },
          ].map((metric, i) => (
            <motion.div key={metric.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }} style={{ background: "#fff", borderRadius: 16, padding: 20, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              {metric.value}
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>{metric.sub}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{metric.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Two Column: Pie + Action ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A2E1A", marginBottom: 16 }}>Emissions Breakdown</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10, fontWeight: 600 }}>
                    {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v.toLocaleString()} t`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ borderLeft: "4px solid #97BC62", paddingLeft: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Your #1 Action</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#1A2E1A", lineHeight: 1.5, fontStyle: "italic", margin: 0 }}>"{s.singleBiggestAction}"</p>
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>TOP COMPETITORS</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(s.topCompetitors || []).map((c) => <span key={c} style={{ padding: "4px 12px", borderRadius: 20, background: "#F4F9F0", border: "1px solid #d1d5db", fontSize: 11, fontWeight: 600, color: "#1A2E1A" }}>{c}</span>)}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Regulatory Risk ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A2E1A" }}>⚖️ Regulatory Exposure</h3>
            <div style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800, background: riskBg(s.regulatoryRisk), color: riskColor(s.regulatoryRisk) }}>{s.regulatoryRisk} Risk</div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>Applicable Regulations</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(s.applicableRegulations || []).map((r) => <span key={r} style={{ padding: "4px 12px", borderRadius: 20, background: "#e0e7d6", color: "#2C5F2D", fontSize: 10, fontWeight: 600 }}>{r}</span>)}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#64748B" }}>Estimated Carbon Tax Liability</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#D97706" }}>${(s.estimatedCarbonTaxLiability || 0).toLocaleString()}</div>
            </div>
          </div>
        </motion.div>

        {/* ── CTA Banner ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          style={{ background: "linear-gradient(135deg, #97BC62, #84CC16)", borderRadius: 16, padding: "32px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, boxShadow: "0 8px 32px rgba(151,188,98,0.35)" }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1A2E1A", margin: "0 0 4px 0" }}>This is your AI-estimated snapshot.</h3>
            <p style={{ fontSize: 13, color: "#1A2E1A", margin: 0, opacity: 0.8 }}>Get your precise, verified carbon footprint with full Scope 1-3 analysis →</p>
          </div>
          <button onClick={() => prefillAndNavigate(s)} style={{ padding: "14px 32px", borderRadius: 10, border: "none", background: "#1A2E1A", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(26,46,26,0.3)" }}>
            Start Full Analysis
          </button>
        </motion.div>

        {/* Bottom links */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={handleTryAnother} style={{ color: "#2C5F2D", fontSize: 13, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}>
            ← Try another company
          </button>
        </div>
      </div>
    </div>
  );
}
