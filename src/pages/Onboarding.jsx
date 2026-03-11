import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context";

const INDUSTRIES = [
  "Technology",
  "Manufacturing",
  "Retail",
  "Healthcare",
  "Finance",
  "Education",
  "Logistics",
  "Other",
];

const EMPLOYEE_BUCKETS = ["1-50", "51-200", "201-500", "501-2000", "2000+"];

const COUNTRIES = [
  "United Kingdom",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "United States",
  "Canada",
  "India",
  "Australia",
  "Other",
];

const YEARS = ["2022", "2023", "2024"];

export function Onboarding() {
  const navigate = useNavigate();
  const { company, setCompany } = useAppContext();
  const [local, setLocal] = useState(company);

  const handleChange = (field) => (e) => {
    setLocal((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCompany(local);
    navigate("/input");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden grid md:grid-cols-2">
        <div className="bg-primaryDark text-white p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest/70 text-xs mb-4">
              <span className="h-2 w-2 rounded-full bg-accentLime animate-pulse" />
              <span>Hackathon Edition</span>
            </div>
            <h1 className="text-2xl font-semibold leading-snug mb-3">
              CarbonIQ – AI-Based Carbon Footprint Analyzer
            </h1>
            <p className="text-sm text-accentLime/80">
              Onboard your organization in under a minute and unlock instant,
              AI-powered emissions analytics, insights, and regulatory signals.
            </p>
          </div>
          <ul className="mt-6 space-y-2 text-xs text-accentLime/80">
            <li>• Automated Scope 1–3 estimates</li>
            <li>• Real-time What-If scenario modelling</li>
            <li>• Investor-ready PDF output in one click</li>
            <li>• Conversational AI copilot tuned to your data</li>
          </ul>
        </div>
        <div className="p-6 md:p-8 bg-lightBg">
          <h2 className="text-base font-semibold text-textDark mb-1">
            Organization profile
          </h2>
          <p className="text-xs text-textGray mb-5">
            These details help CarbonIQ benchmark you against peers and surface
            the right regulations.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-textGray mb-1">
                Company name
              </label>
              <input
                type="text"
                value={local.name}
                onChange={handleChange("name")}
                placeholder="Acme Technologies Ltd"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accentLime focus:border-accentLime bg-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-textGray mb-1">
                  Industry
                </label>
                <select
                  value={local.industry}
                  onChange={handleChange("industry")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accentLime"
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-textGray mb-1">
                  Number of employees
                </label>
                <select
                  value={local.employees}
                  onChange={handleChange("employees")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accentLime"
                >
                  {EMPLOYEE_BUCKETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-textGray mb-1">
                  Country
                </label>
                <select
                  value={local.country}
                  onChange={handleChange("country")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accentLime"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-textGray mb-1">
                  Reporting year
                </label>
                <select
                  value={local.year}
                  onChange={handleChange("year")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accentLime"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accentLime text-primaryDark font-semibold py-2.5 text-sm shadow-sm hover:bg-accentLime/90 transition-colors"
            >
              Get started
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;

