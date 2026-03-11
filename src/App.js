import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Onboarding from "./pages/Onboarding";
import DataInput from "./pages/DataInput";
import Dashboard from "./pages/Dashboard";
import AIInsights from "./pages/AIInsights";
import AIChat from "./pages/AIChat";

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: "easeOut" },
};

function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F9F0] via-[#f5faf4] to-[#e8f2e4] text-textDark">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                {...pageTransition}
                className="max-w-6xl mx-auto"
              >
                <Routes location={location}>
                  <Route path="/" element={<Onboarding />} />
                  <Route path="/input" element={<DataInput />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/insights" element={<AIInsights />} />
                  <Route path="/chat" element={<AIChat />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppShell;

