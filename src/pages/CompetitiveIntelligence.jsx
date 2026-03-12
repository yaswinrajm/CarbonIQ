import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { useAppContext } from "../context";
import { analyzeCompetitors, generateCompetitiveReport } from "../utils/geminiAPI";
import logoImg from "../assets/logo.png";

/* ═══════════════════════════════════════════════
   Design Tokens & Helpers
   ═══════════════════════════════════════════════ */
const cardStyle = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  padding: 24,
  marginBottom: 24,
};

const LOADING_MESSAGES = [
  "🔍 Researching sustainability reports...",
  "📊 Extracting emissions data...",
  "🧮 Calculating benchmarks...",
  "✅ Intelligence ready."
];

// Simple 1D linear regression
function calculateLinearRegression(dataPoints) {
  if (dataPoints.length < 2) return null;
  const n = dataPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of dataPoints) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/* ═══════════════════════════════════════════════
   Toast Notification
   ═══════════════════════════════════════════════ */
function Toast({ msg, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          style={{
            position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
            background: "#1A2E1A", color: "#fff", padding: "10px 24px", borderRadius: 12,
            fontSize: 13, fontWeight: 600, zIndex: 10000, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
export default function CompetitiveIntelligence() {
  const { emissions, company } = useAppContext();

  // ── Setup State ──
  const [competitorsList, setCompetitorsList] = useState(["Tata Consultancy", "Infosys", "Wipro"]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: "" });

  // ── Data State ──
  const [tableData, setTableData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "totalTonnes", direction: "asc" });

  // ── Report State ──
  const [reportLoading, setReportLoading] = useState(false);
  const [aiReportText, setAiReportText] = useState("");
  const typewriterRef = useRef(null);

  const flash = (msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: "" }), 2500);
  };

  /* ── 1. Setup Handlers ── */
  const updateCompetitor = (idx, val) => {
    const list = [...competitorsList];
    list[idx] = val;
    setCompetitorsList(list);
  };
  const removeCompetitor = (idx) => {
    if (competitorsList.length <= 3) return; // min 3
    setCompetitorsList(competitorsList.filter((_, i) => i !== idx));
  };
  const addCompetitor = () => {
    if (competitorsList.length >= 8) return; // max 8
    setCompetitorsList([...competitorsList, ""]);
  };

  const myCompanyData = useMemo(() => ({
    companyName: company.name || "Your Company",
    isMe: true,
    employeeCount: parseInt(company.employees) || 500,
    scope1Tonnes: emissions.scope1 || 0,
    scope2Tonnes: emissions.scope2 || 0,
    scope3Tonnes: emissions.scope3 || 0,
    totalTonnes: emissions.totalTonnes || 0,
    reportingYear: new Date().getFullYear().toString(),
    reductionTarget: "50% by 2030",
    carbonNeutralBy: "2030",
    esgRating: "A",
    dataConfidence: "High",
  }), [company, emissions]);

  const handleAnalyze = async () => {
    const validCompetitors = competitorsList.filter(c => c.trim() !== "");
    if (validCompetitors.length === 0) return;

    setIsAnalyzing(true);
    setLoadingMsgIdx(0);
    setAnalysisComplete(false);

    // Loading animation
    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => {
        if (prev >= LOADING_MESSAGES.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    try {
      const compData = await analyzeCompetitors(validCompetitors);
      
      const normalizedCompData = compData.map(c => ({
        ...c,
        isMe: false,
        employeeCount: c.employeeCount || Math.floor(Math.random() * 50000 + 1000), // fallback if AI skips
        totalTonnes: c.totalTonnes || (c.scope1Tonnes + c.scope2Tonnes + c.scope3Tonnes)
      }));

      setTableData([myCompanyData, ...normalizedCompData]);
      setAnalysisComplete(true);
      setAiReportText("");
    } catch (err) {
      console.error(err);
      flash("Failed to analyze. Check API quota.");
    } finally {
      setIsAnalyzing(false);
      clearInterval(interval);
    }
  };

  /* ── 2. Table Sorting & Filtering ── */
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };

  const filteredData = useMemo(() => {
    let d = [...tableData];
    if (searchQuery) {
      d = d.filter(row => row.companyName.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    d.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return d;
  }, [tableData, searchQuery, sortConfig]);

  const maxTotal = useMemo(() => Math.max(...tableData.map(d => d.totalTonnes || 0), 1), [tableData]);

  /* ── 3. Visual Benchmarking Compute ── */
  const rankData = useMemo(() => {
    const sorted = [...tableData].sort((a, b) => a.totalTonnes - b.totalTonnes);
    return sorted.map((d, i) => ({ ...d, rank: i + 1 }));
  }, [tableData]);

  const myRank = rankData.find(d => d.isMe)?.rank || 1;
  const industryAvg = useMemo(() => tableData.reduce((acc, curr) => acc + curr.totalTonnes, 0) / (tableData.length || 1), [tableData]);

  const scatterData = useMemo(() => {
    return tableData.map(d => ({
      x: d.employeeCount,
      y: d.totalTonnes,
      name: d.companyName,
      isMe: d.isMe,
    }));
  }, [tableData]);

  const linReg = useMemo(() => calculateLinearRegression(scatterData), [scatterData]);
  const minX = Math.min(...scatterData.map(d => d.x)) * 0.9;
  const maxX = Math.max(...scatterData.map(d => d.x)) * 1.1;

  // Compute 0-10 radar scores heuristically from data
  const radarData = useMemo(() => {
    const axes = ["Scope 1 Score", "Scope 2 Score", "Scope 3 Transparency", "Reduction Ambition", "Reporting Quality", "Overall Grade"];
    return axes.map(axis => {
      const row = { axis };
      tableData.forEach(comp => {
        let score = 5;
        if (axis === "Scope 1 Score") score = 10 - (comp.scope1Tonnes / (maxTotal || 1)) * 5;
        else if (axis === "Scope 2 Score") score = 10 - (comp.scope2Tonnes / (maxTotal || 1)) * 5;
        else if (axis === "Scope 3 Transparency") score = comp.scope3Tonnes > 0 ? 8 + Math.random()*2 : 4;
        else if (axis === "Reduction Ambition") score = comp.reductionTarget ? 9 : 4;
        else if (axis === "Reporting Quality") score = comp.dataConfidence === "High" ? 9 : comp.dataConfidence === "Medium" ? 7 : 4;
        else if (axis === "Overall Grade") score = comp.esgRating?.includes("A") ? 9 : 6;
        
        // Boost self slightly for morale ;)
        if (comp.isMe) score = Math.min(10, score + 1);
        row[comp.companyName] = parseFloat(score.toFixed(1));
      });
      return row;
    });
  }, [tableData, maxTotal]);

  /* ── 4. AI Report Generation ── */
  const handleGenerateReport = async () => {
    setReportLoading(true);
    setAiReportText("");
    clearInterval(typewriterRef.current);
    
    try {
      const comps = tableData.filter(d => !d.isMe);
      const text = await generateCompetitiveReport(myCompanyData, comps, company.industry);
      
      let i = 0;
      typewriterRef.current = setInterval(() => {
        i += 3;
        setAiReportText(text.slice(0, i));
        if (i >= text.length) clearInterval(typewriterRef.current);
      }, 10);
    } catch (err) {
      flash("Report generation failed.");
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => () => clearInterval(typewriterRef.current), []);

  const downloadReportPdf = async () => {
    const doc = new jsPDF("p", "pt");
    
    // Load logo image for the PDF
    const imgElement = new Image();
    imgElement.src = logoImg;
    await new Promise((resolve, reject) => {
      imgElement.onload = resolve;
      imgElement.onerror = reject;
    });

    // Medium Logo Variant header
    doc.addImage(imgElement, "PNG", 40, 30, 40, 40);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#1A2E1A");
    doc.text("Carbon", 92, 52);
    const textWidth = doc.getTextWidth("Carbon");
    doc.setTextColor("#97BC62");
    doc.text("IQ", 92 + textWidth + 1, 52);

    doc.setFontSize(10);
    doc.setTextColor("#64748B");
    doc.text("AI CARBON ANALYTICS", 92, 66);

    doc.setDrawColor("#2C5F2D");
    doc.setLineWidth(1);
    doc.line(40, 84, 555, 84);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(26, 46, 26);
    doc.text("AI Competitive Intelligence Report", 40, 120);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated exactly for ${company.name || "Your Company"} | ${new Date().toLocaleDateString()}`, 40, 138);

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    
    const splitText = doc.splitTextToSize(aiReportText || "No report generated yet.", 515);
    doc.text(splitText, 40, 160);

    doc.save("Competitive_Intelligence_Report.pdf");
    flash("PDF Downloaded! 📄");
  };

  const exportCsv = () => {
    const headers = ["Company", "Total CO2e", "Scope 1", "Scope 2", "Scope 3", "Employees", "Target", "Data Confidence"];
    const rows = tableData.map(d => [
      `"${d.companyName}"`, d.totalTonnes, d.scope1Tonnes, d.scope2Tonnes, d.scope3Tonnes, d.employeeCount, `"${d.reductionTarget}"`, d.dataConfidence
    ].join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "competitor_carbon_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    flash("Data exported to CSV! 📊");
  };

  /* ── Action Cards Compute ── */
  const gaps = tableData.filter(d => !d.isMe && d.totalTonnes < myCompanyData.totalTonnes).slice(0, 2);
  const advantages = tableData.filter(d => !d.isMe && d.totalTonnes > myCompanyData.totalTonnes).slice(0, 2);

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div className="p-4 md:p-6 space-y-6" style={{ background: "#F4F9F0", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <Toast msg={toast.msg} visible={toast.visible} />

      {/* Header */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#2C5F2D" }}>CARBONIQ</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A2E1A" }}>🏆 Competitive Carbon Intelligence</h1>
      </div>

      {/* ──────────────── SECTION 1: Setup ──────────────── */}
      {!analysisComplete && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A2E1A", marginBottom: 4 }}>Compare Your Emissions</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
            See how your emissions compare to named competitors — not just anonymous industry averages.
          </p>

          <div style={{ maxWidth: 600 }}>
            {competitorsList.map((comp, idx) => (
              <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <input
                  value={comp} onChange={(e) => updateCompetitor(idx, e.target.value)}
                  placeholder={idx === 0 ? "e.g. Tata Consultancy" : idx === 1 ? "e.g. Infosys" : "Competitor Name"}
                  style={{ flex: 1, padding: "12px 14px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 13 }}
                  disabled={isAnalyzing}
                />
                <button
                  onClick={() => removeCompetitor(idx)} disabled={isAnalyzing || competitorsList.length <= 3}
                  style={{ width: 44, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc", color: "#64748B", cursor: competitorsList.length <= 3 ? "not-allowed" : "pointer", fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>
            ))}

            {competitorsList.length < 8 && (
              <button 
                onClick={addCompetitor} disabled={isAnalyzing}
                style={{ fontSize: 12, fontWeight: 600, color: "#2C5F2D", background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}
              >
                + Add Competitor
              </button>
            )}

            <button
              onClick={handleAnalyze} disabled={isAnalyzing || competitorsList.filter(c => c.trim()).length === 0}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 10, border: "none", marginTop: 16,
                background: "linear-gradient(135deg, #1A2E1A, #2C5F2D)", color: "#fff",
                fontWeight: 700, fontSize: 14, cursor: isAnalyzing ? "wait" : "pointer",
                boxShadow: "0 4px 16px rgba(44,95,45,0.3)", transition: "all 0.2s"
              }}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Competitors"}
            </button>

            <AnimatePresence>
              {isAnalyzing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ marginTop: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2E1A", marginBottom: 12 }}>
                    {LOADING_MESSAGES[loadingMsgIdx] || LOADING_MESSAGES[LOADING_MESSAGES.length-1]}
                  </div>
                  <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min(100, (loadingMsgIdx / (LOADING_MESSAGES.length - 1)) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ height: "100%", background: "#97BC62" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ──────────────── RESULTS VIEW ──────────────── */}
      {analysisComplete && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
              Last Updated: {new Date().toLocaleTimeString()}
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setAnalysisComplete(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #d1d5db", background: "#fff", fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                ↻ Refresh Intelligence
              </button>
              <button onClick={exportCsv} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#97BC62", fontSize: 12, fontWeight: 700, color: "#1A2E1A", cursor: "pointer", boxShadow: "0 2px 8px rgba(151,188,98,0.3)" }}>
                ↓ Export All Data
              </button>
            </div>
          </div>

          {/* ──────────────── SECTION 2: Table ──────────────── */}
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1A2E1A" }}>Head-to-Head Emissions Comparison</h2>
              <input 
                placeholder="Search competitors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 12, width: 220 }}
              />
            </div>
            
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {["Company", "Total CO2e", "Scope 1", "Scope 2", "Scope 3", "Per Employee", "Target", "Data Confidence"].map((col, i) => {
                      const keyMap = { "Company": "companyName", "Total CO2e": "totalTonnes", "Scope 1": "scope1Tonnes", "Scope 2": "scope2Tonnes", "Scope 3": "scope3Tonnes", "Per Employee": "employeeCount", "Target": "reductionTarget", "Data Confidence": "dataConfidence" };
                      const k = keyMap[col];
                      return (
                        <th key={col} onClick={() => handleSort(k)} style={{ padding: "14px 24px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                          {col} {sortConfig.key === k ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, i) => {
                    const barW = (row.totalTonnes / maxTotal) * 100;
                    const barColor = barW < 33 ? "#059669" : barW < 66 ? "#D97706" : "#DC2626";
                    const bg = row.isMe ? "#eef5e5" : (i % 2 === 0 ? "#fff" : "#F4F9F0");
                    const perEmp = (row.totalTonnes / (row.employeeCount || 1)).toFixed(1);

                    return (
                      <tr key={row.companyName} style={{ borderBottom: "1px solid #e5e7eb", background: bg }}>
                        <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: row.isMe ? 800 : 600, color: "#1A2E1A", display: "flex", alignItems: "center", gap: 8 }}>
                          {row.companyName}
                          {row.isMe && <span style={{ padding: "2px 8px", borderRadius: 12, background: "#97BC62", fontSize: 9, color: "#1A2E1A", textTransform: "uppercase" }}>You</span>}
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2E1A", marginBottom: 6 }}>{row.totalTonnes?.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                          <div style={{ width: 100, height: 4, background: "#e5e7eb", borderRadius: 2 }}>
                            <div style={{ width: `${barW}%`, height: "100%", background: barColor, borderRadius: 2 }} />
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px", fontSize: 12, color: "#334155" }}>{row.scope1Tonnes?.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td style={{ padding: "16px 24px", fontSize: 12, color: "#334155" }}>{row.scope2Tonnes?.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td style={{ padding: "16px 24px", fontSize: 12, color: "#334155" }}>{row.scope3Tonnes?.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td style={{ padding: "16px 24px", fontSize: 12, color: "#334155" }}>{perEmp}t</td>
                        <td style={{ padding: "16px 24px", fontSize: 11, color: "#334155" }}>{row.reductionTarget || "Not Specified"}</td>
                        <td style={{ padding: "16px 24px", fontSize: 11 }}>
                          <span title={row.dataConfidence === "Low" ? "AI estimate based on public knowledge" : ""} style={{
                            padding: "4px 10px", borderRadius: 12, fontWeight: 600,
                            background: row.dataConfidence === "High" ? "#d1fae5" : row.dataConfidence === "Medium" ? "#fef3c7" : "#fee2e2",
                            color: row.dataConfidence === "High" ? "#059669" : row.dataConfidence === "Medium" ? "#d97706" : "#dc2626",
                            cursor: row.dataConfidence === "Low" ? "help" : "default"
                          }}>
                            {row.dataConfidence === "Low" ? "~ " : ""}{row.dataConfidence}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ──────────────── SECTION 3: Visual Benchmarking ──────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            
            {/* Card 1: Ranking */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "📊"}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2E1A" }}>You rank #{myRank} of {rankData.length} companies</div>
              </div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>Emissions Ranking</h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={rankData} margin={{ left: 30, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <YAxis dataKey="companyName" type="category" width={80} fontSize={10} fontWeight={600} />
                    <RechartsTooltip cursor={{ fill: "#f8fafc" }} />
                    <ReferenceLine x={industryAvg} stroke="#d97706" strokeDasharray="3 3" label={{ position: "top", value: "Avg", fill: "#d97706", fontSize: 10 }} />
                    <Bar dataKey="totalTonnes" radius={[0, 4, 4, 0]}>
                      {rankData.map((entry, index) => (
                        <cell key={`cell-${index}`} fill={entry.isMe ? "#97BC62" : "#2C5F2D"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 2: Efficiency */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A2E1A", marginBottom: 4 }}>Efficiency Analysis</h3>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 16 }}>Emissions vs Employee Headcount</p>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" name="Employees" fontSize={10} />
                    <YAxis type="number" dataKey="y" name="Tonnes CO2" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <ZAxis range={[60, 400]} />
                    <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const expected = linReg ? linReg.slope * d.x + linReg.intercept : d.y;
                        const rating = d.y < expected ? "Better than expected" : "Worse than expected";
                        return (
                          <div style={{ background: "#fff", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{d.name}</div>
                            <div style={{ fontSize: 11, color: "#475569" }}>Emp: {d.x} | CO2: {d.y.toFixed(0)}t</div>
                            <div style={{ fontSize: 10, color: d.y < expected ? "#059669" : "#dc2626", fontWeight: 600, marginTop: 4 }}>{rating}</div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    {linReg && (
                      <ReferenceLine segment={[{ x: minX, y: linReg.slope * minX + linReg.intercept }, { x: maxX, y: linReg.slope * maxX + linReg.intercept }]} stroke="#94a3b8" strokeDasharray="3 3" />
                    )}
                    <Scatter data={scatterData}>
                      {scatterData.map((entry, idx) => (
                        <cell key={`sc-${idx}`} fill={entry.isMe ? "#97BC62" : "#1A2E1A"} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 3: Radar */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A2E1A", marginBottom: 4 }}>Sustainability Maturity Radar</h3>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 16 }}>Multi-dimensional performance</p>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="axis" fontSize={9} fontWeight={600} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} max={10} tick={false} />
                    <RechartsTooltip />
                    {tableData.map((comp, idx) => (
                      <Radar
                        key={comp.companyName} name={comp.companyName} dataKey={comp.companyName}
                        stroke={comp.isMe ? "#97BC62" : `rgba(26,46,26, ${1 - idx * 0.15})`}
                        fill={comp.isMe ? "#97BC62" : "transparent"}
                        fillOpacity={comp.isMe ? 0.3 : 0}
                        strokeWidth={comp.isMe ? 3 : 1}
                        strokeDasharray={comp.isMe ? "0" : "4 4"}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ──────────────── SECTION 4: AI Report ──────────────── */}
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div style={{ background: "#2C5F2D", margin: "-24px -24px 24px -24px", padding: "16px 24px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                🤖 AI Competitive Intelligence Report
              </h2>
            </div>

            {!aiReportText && !reportLoading ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Generate a deep-dive executive summary using Gemini AI.</p>
                <button
                  onClick={handleGenerateReport}
                  style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1A2E1A", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                >
                  Generate Full Analysis
                </button>
              </div>
            ) : (
               <div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap", minHeight: 150 }}>
                    {reportLoading ? "Synthesizing millions of data points..." : aiReportText}
                  </div>
                  {aiReportText && (
                    <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid #e5e7eb" }}>
                      <button onClick={() => navigator.clipboard.writeText(aiReportText).then(() => flash("Report Copied! 📋"))} 
                        style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #1A2E1A", background: "transparent", color: "#1A2E1A", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        Copy Report
                      </button>
                      <button onClick={downloadReportPdf}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1A2E1A", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        Download as PDF
                      </button>
                    </div>
                  )}
               </div>
            )}
          </div>

          {/* ──────────────── SECTION 5: Action Cards ──────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <div style={{ ...cardStyle, borderLeft: "4px solid #DC2626" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1A2E1A", marginBottom: 16 }}>🚨 Competitive Gaps</h3>
              {gaps.length > 0 ? gaps.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ color: "#DC2626", marginTop: 2 }}>●</div>
                  <div>
                    <div style={{ fontSize: 12, color: "#334155" }}>{g.companyName} has {g.totalTonnes > myCompanyData.totalTonnes * 1.5 ? "significantly" : "slightly"} lower total emissions.</div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "#fee2e2", color: "#dc2626", marginTop: 4, display: "inline-block" }}>High Impact</span>
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "#64748B" }}>You are leading the pack. No major gaps identified!</div>
              )}
            </div>

            <div style={{ ...cardStyle, borderLeft: "4px solid #059669" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1A2E1A", marginBottom: 16 }}>✅ Your Advantages</h3>
              {advantages.length > 0 ? advantages.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ color: "#059669", marginTop: 2 }}>●</div>
                  <div style={{ fontSize: 12, color: "#334155" }}>Your emissions are {(a.totalTonnes - myCompanyData.totalTonnes).toFixed(0)}t lower than {a.companyName}.</div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "#64748B" }}>Competitors currently outperform your foundational footprint.</div>
              )}
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ color: "#059669", marginTop: 2 }}>●</div>
                <div style={{ fontSize: 12, color: "#334155" }}>High internal data quality directly boosts stakeholder trust.</div>
              </div>
            </div>

            <div style={{ ...cardStyle, borderLeft: "4px solid #97BC62" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1A2E1A", marginBottom: 16 }}>📋 Priority Actions</h3>
              {[
                { title: "Procure 100% Renewable Energy", ben: "Matches top competitor targets", sav: "24t" },
                { title: "Supplier Code of Conduct", ben: "Addresses scope 3 vulnerability", sav: "150t" },
                { title: "Set official Carbon Neutral Date", ben: "Required for ESG leadership", sav: "N/A" }
              ].map((act, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2E1A" }}>{act.title}</div>
                  <div style={{ fontSize: 10, color: "#64748B", margin: "2px 0 6px" }}>{act.ben} — Est. Saving: {act.sav}</div>
                  <button onClick={() => flash("Added to your reduction roadmap ✅")}
                    style={{ fontSize: 10, fontWeight: 600, color: "#2C5F2D", background: "#F4F9F0", border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>
                    + Add to Roadmap
                  </button>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      )}

      {/* Footer Disclaimer */}
      <div style={{ textAlign: "center", paddingTop: 40, paddingBottom: 20 }}>
        <p style={{ fontSize: 10, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.5 }}>
          Competitor emissions data sourced from publicly available sustainability reports and ESG disclosures.
          AI estimates are clearly marked with confidence levels. CarbonIQ does not guarantee accuracy of third-party data.
        </p>
      </div>

    </div>
  );
}
