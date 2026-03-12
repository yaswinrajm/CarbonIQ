import React from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "../context";
import Logo from "./Logo";

function titleForPath(pathname) {
  if (pathname === "/") return "Onboarding";
  if (pathname.startsWith("/input")) return "Data Input";
  if (pathname.startsWith("/dashboard")) return "Carbon Dashboard";
  if (pathname.startsWith("/insights")) return "AI Insights & Roadmap";
  if (pathname.startsWith("/chat")) return "AI Sustainability Copilot";
  if (pathname.startsWith("/competitive")) return "Competitive Intelligence";
  if (pathname.startsWith("/budget")) return "Budget Planner";
  if (pathname.startsWith("/public-page")) return "Public Page";
  return "Features";
}

export function Navbar() {
  const location = useLocation();
  const { company, emissions } = useAppContext();

  const title = titleForPath(location.pathname);

  return (
    <header className="w-full border-b border-slate-100/80 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo size="medium" />
          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="text-[22px] md:text-[24px] font-bold text-textDark"
          >
            {title}
          </motion.div>
        </div>
        <div className="flex items-center gap-4 text-xs md:text-sm text-textGray">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-semibold text-textDark">
              {company.name || "Demo organization"}
            </span>
            <span className="text-[11px] text-textGray">
              {company.industry} • {company.country}
            </span>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="px-3 py-1 rounded-full bg-lightBg border border-accentLime/40 flex items-center gap-2 text-[11px] md:text-xs shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-accentLime animate-pulse" />
            <span className="font-semibold text-textDark">
              Score:{" "}
              {emissions.carbonScore
                ? Math.round(emissions.carbonScore)
                : "—"}
            </span>
            <span className="text-textGray">
              ({emissions.grade || "N/A"})
            </span>
          </motion.div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;

