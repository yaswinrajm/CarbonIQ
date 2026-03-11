import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../context";
import { analyzeEmissions } from "../utils/geminiAPI";
import { generateCarbonReportPDF } from "../utils/pdfGenerator";

export function AIInsights() {
  const { emissions, company } = useAppContext();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasData = (emissions.totalTonnes || 0) > 0;

  useEffect(() => {
    if (!hasData) return;
    let cancelled = false;
    const fetchInsights = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await analyzeEmissions(emissions, company);
        if (!cancelled) {
          setInsights(res);
        }
      } catch (e) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error(e);
          setError(
            "We couldn't fetch AI insights right now. Please confirm your API key and try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInsights();
    return () => {
      cancelled = true;
    };
  }, [hasData, emissions, company]);

  const handleDownload = () => {
    if (!insights) return;
    generateCarbonReportPDF(company, emissions, insights);
  };

  if (!hasData) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto card-premium p-5 text-sm text-textGray">
          Run a baseline first via the{" "}
          <span className="font-semibold text-textDark">Data Input</span> and{" "}
          <span className="font-semibold text-textDark">Dashboard</span> pages,
          then return here for an AI-generated roadmap, benchmarking and risk
          view.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-textDark">
            AI-generated decarbonization plan
          </h2>
          <p className="text-xs md:text-sm text-textGray">
            Gemini analyzes your footprint and industry to propose a pragmatic
            12-month roadmap and top actions.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!insights}
          className="btn-gradient text-[11px] md:text-sm disabled:opacity-50"
        >
          📄 Download full report (PDF)
        </button>
      </div>

      {loading && (
        <motion.div
          className="card-premium p-6 flex items-center gap-3 text-sm text-textGray"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="h-4 w-4 border-2 border-accentLime border-t-transparent rounded-full animate-spin" />
          <span>Asking Gemini to build your roadmap…</span>
        </motion.div>
      )}
      {error && (
        <div className="bg-danger/5 border border-danger/30 text-danger text-xs md:text-sm rounded-2xl p-4">
          {error}
        </div>
      )}

      {insights && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <motion.div
              className="lg:col-span-2 card-premium p-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <h3 className="text-sm font-semibold text-textDark mb-1">
                12-month carbon reduction roadmap
              </h3>
              <p className="text-[11px] text-textGray mb-4">
                Each milestone combines abatement potential, cost and
                implementation difficulty.
              </p>
              <div className="space-y-4">
                {insights.roadmap?.map((step) => (
                  <div
                    key={step.month}
                    className="flex items-start gap-3 text-xs md:text-sm"
                  >
                    <div className="flex flex-col items-center mr-1">
                      <div className="h-8 w-8 rounded-full bg-accentLime/15 border border-accentLime/40 flex items-center justify-center text-[11px] font-semibold text-primaryDark">
                        M{step.month}
                      </div>
                      {step.month < insights.roadmap.length && (
                        <div className="flex-1 w-px bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-textDark">
                        {step.action}
                      </div>
                      <div className="text-[11px] text-textGray mt-0.5">
                        Saving:{" "}
                        <span className="font-semibold text-good">
                          {step.saving_tonnes} t CO₂e
                        </span>{" "}
                        • Cost: {step.cost} • Difficulty: {step.difficulty}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <div className="space-y-4">
              <motion.div
                className="card-premium p-4"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
              >
                <h3 className="text-sm font-semibold text-textDark mb-2">
                  Top 3 recommendations
                </h3>
                <div className="space-y-3 text-xs md:text-sm">
                  {insights.top3_recommendations?.map((rec, idx) => (
                    <div
                      key={rec.title}
                      className="rounded-xl border border-slate-200 bg-lightBg px-3 py-2"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-semibold text-textDark">
                          {idx + 1}. {rec.title}
                        </div>
                        <div className="text-[10px] text-good font-semibold">
                          {rec.saving_tonnes} t • ${rec.cost_saving}
                        </div>
                      </div>
                      <p className="text-[11px] text-textGray">
                        {rec.description}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                className="card-premium p-4 text-xs md:text-sm"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
              >
                <h3 className="text-sm font-semibold text-textDark mb-1">
                  Risk assessment
                </h3>
                <p className="text-[11px] text-textGray mb-2">
                  Qualitative view on regulatory and transition risk.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/5 border border-warning/40 text-xs font-semibold text-warning mb-2">
                  Risk score: {insights.risk_score}
                </div>
                <p className="text-[11px] text-textGray">
                  {insights.risk_explanation}
                </p>
              </motion.div>
            </div>
          </div>
          <motion.div
            className="card-premium p-4 text-xs md:text-sm"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <h3 className="text-sm font-semibold text-textDark mb-1">
              Industry benchmark analysis
            </h3>
            <p className="text-[11px] text-textGray mb-2">
              How your intensity compares to peers and what that implies.
            </p>
            <p className="text-[11px] text-textDark leading-relaxed">
              {insights.industry_benchmark_analysis}
            </p>
          </motion.div>
        </>
      )}
    </div>
  );
}

export default AIInsights;

