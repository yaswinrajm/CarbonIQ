import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { useAppContext } from "../context";
import { chatWithData } from "../utils/geminiAPI";
import Logo from "../components/Logo";

/* ═══════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════ */
const SWATCHES = ["#97BC62", "#2C5F2D", "#4A8C4B", "#1A2E1A", "#84CC16"];

const card = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  padding: 24,
};

/* ═══════════════════════════════════════════════
   Toast
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
   Toggle Switch
   ═══════════════════════════════════════════════ */
function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", cursor: "pointer" }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>{label}</span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 12, padding: 2, cursor: "pointer",
          background: checked ? "#97BC62" : "#d1d5db", transition: "background 0.2s",
          display: "flex", alignItems: "center",
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "transform 0.2s",
          transform: checked ? "translateX(18px)" : "translateX(0)",
        }} />
      </div>
    </label>
  );
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
export default function PublicPage() {
  const { emissions, company } = useAppContext();
  const slug = (company.name || "your-company").toLowerCase().replace(/\s+/g, "-");
  const fakeUrl = `carboniq.app/${slug}-sustainability`;

  /* ── state ── */
  const [tagline, setTagline] = useState("");
  const [accent, setAccent] = useState("#97BC62");
  const [showScore, setShowScore] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showRoadmap, setShowRoadmap] = useState(true);
  const [showRegulatory, setShowRegulatory] = useState(true);
  const [showPledge, setShowPledge] = useState(false);
  const [commitment, setCommitment] = useState("");
  const [logo, setLogo] = useState(null);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: "" });
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const typewriterRef = useRef(null);

  const totalEmissions = emissions.totalTonnes || 0;
  const scope1 = emissions.scope1 || 0;
  const scope2 = emissions.scope2 || 0;
  const scope3 = emissions.scope3 || 0;
  const grade = emissions.grade || "N/A";
  const score = emissions.carbonScore?.toFixed?.(0) ?? "-";

  /* ── QR code ── */
  useEffect(() => {
    QRCode.toDataURL(`https://${fakeUrl}`, { width: 140, margin: 1, color: { dark: "#1A2E1A" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [fakeUrl]);

  /* ── toast helper ── */
  const flash = useCallback((msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: "" }), 2500);
  }, []);

  /* ── copy helper ── */
  function copyText(text, msg) {
    navigator.clipboard.writeText(text).then(() => flash(msg));
  }

  /* ── logo upload ── */
  function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  }

  /* ── AI commitment ── */
  async function generateCommitment() {
    setAiLoading(true);
    try {
      const prompt = `Write a professional 3-sentence sustainability commitment statement for ${company.name || "our organization"}, a ${company.industry} company with ${totalEmissions.toFixed(1)} tonnes CO2e total emissions. The statement should be suitable for a public-facing sustainability page and reference specific, ambitious goals. Do not use bullet points. Write in first person plural (we/our). Return ONLY the 3 sentences, nothing else.`;
      const response = await chatWithData([{ role: "user", content: prompt }], emissions, company);
      let i = 0;
      clearInterval(typewriterRef.current);
      setCommitment("");
      typewriterRef.current = setInterval(() => {
        i += 2;
        setCommitment(response.slice(0, i));
        if (i >= response.length) clearInterval(typewriterRef.current);
      }, 12);
    } catch {
      setCommitment("We are committed to reducing our environmental impact and achieving net-zero emissions. Our sustainability strategy focuses on measurable targets aligned with the Paris Agreement. We believe transparency and accountability are essential to building a sustainable future.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => () => clearInterval(typewriterRef.current), []);

  /* ── embed snippet ── */
  const embedCode = `<iframe src="https://${fakeUrl}" width="100%" height="800" frameborder="0" title="${company.name || "Company"} Sustainability"></iframe>`;
  const shareMsg = `We have published our carbon footprint — see our commitment to sustainability: https://${fakeUrl}`;

  /* ── scope bar widths ── */
  const maxScope = Math.max(scope1, scope2, scope3, 0.01);
  const s1w = (scope1 / maxScope) * 100;
  const s2w = (scope2 / maxScope) * 100;
  const s3w = (scope3 / maxScope) * 100;

  /* ── grade color ── */
  const gradeColor = grade === "A" ? "#059669" : grade === "B" ? "#97BC62" : grade === "C" ? "#D97706" : grade === "D" ? "#EA580C" : "#DC2626";

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div className="p-4 md:p-6 space-y-6" style={{ background: "#F4F9F0", minHeight: "100vh" }}>
      <Toast msg={toast.msg} visible={toast.visible} />

      {/* Page header */}
      <div>
        <Logo size="medium" className="mb-6" />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1A2E1A" }}>🌍 Public Sustainability Page</h1>
      </div>

      {/* ══════════ Two-column layout ══════════ */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* ─── LEFT: Customizer ─── */}
        <div style={{ width: "40%", flexShrink: 0, ...card }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1A2E1A", marginBottom: 2 }}>Customize Your Public Page</h2>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 20 }}>Create a shareable sustainability page for customers and investors.</p>

          {/* Tagline */}
          <label style={{ fontSize: 12, fontWeight: 600, color: "#1A2E1A", display: "block", marginBottom: 4 }}>Company Tagline</label>
          <input
            value={tagline} onChange={(e) => setTagline(e.target.value)}
            placeholder="We are committed to a sustainable future"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #d1d5db", fontSize: 13, marginBottom: 16 }}
          />

          {/* Accent */}
          <label style={{ fontSize: 12, fontWeight: 600, color: "#1A2E1A", display: "block", marginBottom: 6 }}>Accent Color</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {SWATCHES.map((c) => (
              <button
                key={c} onClick={() => setAccent(c)}
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: accent === c ? "3px solid #1A2E1A" : "2px solid #e5e7eb",
                  background: c, cursor: "pointer", transition: "border 0.2s",
                }}
              />
            ))}
          </div>

          {/* Toggles */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, marginBottom: 12 }}>
            <Toggle label="Show Carbon Score" checked={showScore} onChange={setShowScore} />
            <Toggle label="Show Emissions Breakdown" checked={showBreakdown} onChange={setShowBreakdown} />
            <Toggle label="Show Reduction Roadmap" checked={showRoadmap} onChange={setShowRoadmap} />
            <Toggle label="Show Regulatory Status" checked={showRegulatory} onChange={setShowRegulatory} />
            <Toggle label="Show Reduction Pledge" checked={showPledge} onChange={setShowPledge} />
          </div>

          {/* Commitment */}
          <label style={{ fontSize: 12, fontWeight: 600, color: "#1A2E1A", display: "block", marginBottom: 4 }}>Commitment Statement</label>
          <textarea
            value={commitment} onChange={(e) => setCommitment(e.target.value)}
            placeholder="Write your sustainability commitment..."
            rows={4}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #d1d5db", fontSize: 12, resize: "vertical", marginBottom: 4 }}
          />
          <button
            onClick={generateCommitment} disabled={aiLoading}
            style={{ fontSize: 11, fontWeight: 600, color: "#2C5F2D", background: "none", border: "none", cursor: "pointer", marginBottom: 14 }}
          >
            {aiLoading ? "Generating..." : "✨ Generate with AI"}
          </button>

          {/* Logo upload */}
          <label style={{ fontSize: 12, fontWeight: 600, color: "#1A2E1A", display: "block", marginBottom: 4 }}>Upload Logo</label>
          <input type="file" accept=".png,.jpg,.jpeg" onChange={handleLogo} style={{ fontSize: 12, marginBottom: 16 }} />
          {logo && <img src={logo} alt="Logo" style={{ width: 60, height: 60, objectFit: "contain", marginBottom: 12, borderRadius: 8 }} />}

          {/* Action buttons */}
          <button
            onClick={() => flash("Preview updated! 👁️")}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10, border: "2px solid #1A2E1A",
              background: "transparent", color: "#1A2E1A", fontWeight: 700, fontSize: 13,
              cursor: "pointer", marginBottom: 8,
            }}
          >
            👁️ Preview
          </button>
          <button
            onClick={() => setLinkGenerated(true)}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #97BC62, #2C5F2D)", color: "#fff",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(44,95,45,0.3)",
            }}
          >
            🔗 Generate Shareable Link
          </button>

          {linkGenerated && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, display: "flex", gap: 6 }}>
              <input readOnly value={`https://${fakeUrl}`} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 11, background: "#F4F9F0" }} />
              <button
                onClick={() => copyText(`https://${fakeUrl}`, "Link copied! Share your commitment 🌱")}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1A2E1A", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}
              >
                Copy
              </button>
            </motion.div>
          )}
        </div>

        {/* ─── RIGHT: Live Preview ─── */}
        <div style={{ flex: 1 }}>
          {/* Browser frame */}
          <div style={{ borderRadius: "14px 14px 0 0", border: "1px solid #d1d5db", overflow: "hidden", background: "#fff" }}>
            {/* Chrome bar */}
            <div style={{ background: "#f1f3f4", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C93F" }} />
              </div>
              <div style={{ flex: 1, background: "#fff", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "#94a3b8" }}>
                {fakeUrl}
              </div>
            </div>

            {/* Live page content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${accent}-${showScore}-${showBreakdown}-${showRoadmap}-${showPledge}-${showRegulatory}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ minHeight: 500 }}
              >
                {/* Hero */}
                <div style={{ background: "#1A2E1A", padding: "40px 28px 20px", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    {logo && <img src={logo} alt="" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6 }} />}
                    <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>{company.name || "Your Company"}</h2>
                  </div>
                  <p style={{ color: "#e2e8f0", fontSize: 13, margin: 0 }}>{tagline || "We are committed to a sustainable future"}</p>
                  <div style={{ height: 4, background: accent, borderRadius: 2, marginTop: 18 }} />
                </div>

                {/* Hero metrics */}
                {showScore && (
                  <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ flex: 1, padding: "18px 24px", textAlign: "center", borderRight: "1px solid #e5e7eb" }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: "50%", margin: "0 auto 6px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `3px solid ${gradeColor}`, fontSize: 20, fontWeight: 800, color: gradeColor,
                      }}>{grade}</div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>Carbon Score</div>
                    </div>
                    <div style={{ flex: 1, padding: "18px 24px", textAlign: "center", borderRight: "1px solid #e5e7eb" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#1A2E1A" }}>{totalEmissions.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>tonnes CO₂e</div>
                    </div>
                    <div style={{ flex: 1, padding: "18px 24px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#059669" }}>
                        <span style={{ fontSize: 14 }}>▼</span> 20%
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>Year on Year</div>
                    </div>
                  </div>
                )}

                {/* Emissions Breakdown */}
                {showBreakdown && (
                  <div style={{ padding: "22px 28px", borderBottom: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A2E1A", marginBottom: 14 }}>Our Emissions Story</h3>
                    {[
                      { label: "Scope 1 — Direct", val: scope1, w: s1w, color: "#2C5F2D" },
                      { label: "Scope 2 — Energy", val: scope2, w: s2w, color: "#4A8C4B" },
                      { label: "Scope 3 — Value Chain", val: scope3, w: s3w, color: "#97BC62" },
                    ].map((s) => (
                      <div key={s.label} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                          <span style={{ color: "#334155", fontWeight: 500 }}>{s.label}</span>
                          <span style={{ color: "#64748B" }}>{s.val.toFixed(1)}t ({totalEmissions > 0 ? ((s.val / totalEmissions) * 100).toFixed(0) : 0}%)</span>
                        </div>
                        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${s.w}%`, height: "100%", background: s.color, borderRadius: 4, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    ))}
                    <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.6, marginTop: 12 }}>
                      Our total carbon footprint is {totalEmissions.toFixed(1)} tonnes CO₂e.
                      {scope2 > scope1 && scope2 > scope3 ? " The majority comes from energy consumption in our operations, which we're actively working to reduce through renewable procurement." :
                       scope3 > scope1 ? " Most of our impact comes from our supply chain and business travel, where we're engaging suppliers on decarbonization." :
                       " Direct operational emissions are our primary focus for reduction through fuel switching and efficiency improvements."}
                    </p>
                  </div>
                )}

                {/* Roadmap / Commitments */}
                {showRoadmap && (
                  <div style={{ padding: "22px 28px", borderBottom: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A2E1A", marginBottom: 14 }}>Our Commitments</h3>
                    {[
                      { action: "Switch to 100% renewable electricity", target: "Q2 2025" },
                      { action: "Reduce business flights by 40%", target: "Q4 2025" },
                      { action: "Achieve carbon-neutral operations", target: "2026" },
                    ].map((c, i) => (
                      <div key={i} style={{ padding: "12px 14px", background: "#F4F9F0", borderRadius: 10, marginBottom: 8, border: "1px solid #e5e7eb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2E1A" }}>{c.action}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: accent + "22", color: accent === "#1A2E1A" ? "#2C5F2D" : accent }}>
                            {c.target}
                          </span>
                        </div>
                        <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: "0%", height: "100%", background: accent, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>Not started</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Regulatory */}
                {showRegulatory && (
                  <div style={{ padding: "18px 28px", borderBottom: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1A2E1A", marginBottom: 8 }}>Regulatory Alignment</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["GHG Protocol", "TCFD", "CSRD", "SBTi"].map((f) => (
                        <span key={f} style={{ fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: "#D1FAE5", color: "#059669" }}>
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pledge banner */}
                {showPledge && (
                  <div style={{ background: "#1A2E1A", padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, fontStyle: "italic", margin: 0, flex: 1, lineHeight: 1.5 }}>
                      "{company.name || "Our company"} commits to reducing emissions by 50% by 2030"
                    </p>
                    <div style={{ padding: "6px 14px", borderRadius: 20, background: "#97BC62", color: "#1A2E1A", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap", marginLeft: 16 }}>
                      🌱 CarbonIQ Verified
                    </div>
                  </div>
                )}

                {/* Commitment text */}
                {commitment && (
                  <div style={{ padding: "18px 28px", borderBottom: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1A2E1A", marginBottom: 8 }}>Our Commitment</h3>
                    <p style={{ fontSize: 12, color: "#334155", lineHeight: 1.7, fontStyle: "italic" }}>"{commitment}"</p>
                  </div>
                )}

                {/* Footer */}
                <div style={{ background: "#1A2E1A", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ transform: "scale(0.8)", transformOrigin: "left center" }}>
                    <Logo size="small" />
                  </div>
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>Carbon data verified by CarbonIQ</span>
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>{new Date().toLocaleDateString()}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ══════════ Share Options Card ══════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1A2E1A", marginBottom: 16 }}>Share Your Commitment</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 20, alignItems: "flex-start" }}>
          {/* Shareable Link */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Shareable Link</label>
            <div style={{ display: "flex", gap: 4 }}>
              <input readOnly value={`https://${fakeUrl}`} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 11, background: "#F4F9F0" }} />
              <button onClick={() => copyText(`https://${fakeUrl}`, "Link copied! Share your commitment 🌱")}
                style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#1A2E1A", color: "#fff", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>
                Copy
              </button>
            </div>
          </div>

          {/* Embed Code */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Embed Code</label>
            <pre style={{ background: "#1e293b", color: "#a5f3fc", padding: "8px 10px", borderRadius: 8, fontSize: 9, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", margin: 0 }}>
              {embedCode}
            </pre>
            <button onClick={() => copyText(embedCode, "Embed code copied! 📋")}
              style={{ marginTop: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "transparent", color: "#334155", fontWeight: 600, fontSize: 10, cursor: "pointer" }}>
              Copy Code
            </button>
          </div>

          {/* Social Share */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Social Share</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { name: "LinkedIn", bg: "#0077B5", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://${fakeUrl}`)}` },
                { name: "Twitter", bg: "#1DA1F2", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMsg)}` },
                { name: "Email", bg: "#64748B", href: `mailto:?subject=${encodeURIComponent(`${company.name || "Our"} Carbon Footprint`)}&body=${encodeURIComponent(shareMsg)}` },
              ].map((s) => (
                <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ padding: "6px 14px", borderRadius: 20, background: s.bg, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                  {s.name}
                </a>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div style={{ textAlign: "center" }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>QR Code</label>
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: 100, height: 100 }} />}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
