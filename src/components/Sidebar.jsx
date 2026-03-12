import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "../context";
import Logo from "./Logo";

const navItems = [
  { to: "/onboarding", label: "Overview" },
  { to: "/input", label: "Data Input" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/insights", label: "AI Insights" },
  { to: "/competitive", label: "🏆 Competitors" },
  { to: "/budget", label: "💰 Budget Planner" },
  { to: "/chat", label: "AI Chat" },
  { to: "/public-page", label: "🌍 Public Page" },
];

export function Sidebar() {
  const { company } = useAppContext();

  return (
    <aside className="bg-primaryDark text-white w-64 flex-shrink-0 hidden md:flex flex-col justify-between min-h-screen shadow-xl">
      <div>
        <div className="px-6 py-6 border-b border-forest/60">
          <Logo size="small" />
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200"
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    layout
                    className="h-8 w-1 rounded-full"
                    animate={{
                      backgroundColor: isActive ? "#97BC62" : "transparent",
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  />
                  <div
                    className={`flex-1 flex items-center gap-3 px-2 py-1 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? "bg-forest/80 text-accentLime font-semibold"
                        : "text-gray-200/90 group-hover:bg-forest/70 group-hover:text-white"
                    }`}
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-accentLime/80" />
                    <span>{item.label}</span>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="px-4 py-4 border-t border-forest/60 text-xs text-gray-200/80">
        <div className="font-semibold truncate">
          {company.name || "No company set"}
        </div>
        <div className="text-[10px] text-gray-300/80">
          {company.industry} • {company.country} • {company.year}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

