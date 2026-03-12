import React from "react";
import { motion } from "framer-motion";
import leafLogo from "../assets/logo.png";

export function Logo({ size = "small", className = "" }) {
  if (size === "small") {
    // Small variant (for sidebar)
    return (
      <div className={`flex items-center gap-[10px] ${className}`}>
        <img
          src={leafLogo}
          alt="CarbonIQ Logo"
          style={{ width: 28, height: 28, objectFit: "contain" }}
        />
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline" style={{ lineHeight: 1 }}>
            <span style={{ color: "#ffffff", fontWeight: "bold", fontSize: "16pt" }}>
              Carbon
            </span>
            <span style={{ color: "#97BC62", fontWeight: "bold", fontSize: "16pt" }}>
              IQ
            </span>
          </div>
          <div
            style={{
              color: "#97BC62",
              fontSize: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: "2px",
            }}
          >
            AI Carbon Analytics
          </div>
        </div>
      </div>
    );
  }

  if (size === "medium") {
    // Medium variant (for navbar and headers)
    return (
      <div className={`flex items-center gap-[12px] ${className}`}>
        <img
          src={leafLogo}
          alt="CarbonIQ Logo"
          style={{ width: 40, height: 40, objectFit: "contain" }}
        />
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline" style={{ lineHeight: 1 }}>
            <span style={{ color: "#1A2E1A", fontWeight: "bold", fontSize: "22pt" }}>
              Carbon
            </span>
            <span style={{ color: "#97BC62", fontWeight: "bold", fontSize: "22pt" }}>
              IQ
            </span>
          </div>
          <div
            style={{
              color: "#64748B",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: "2px",
            }}
          >
            AI Carbon Analytics
          </div>
        </div>
      </div>
    );
  }

  if (size === "large") {
    // Large variant (for landing page and onboarding)
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`flex flex-col items-center justify-center gap-4 ${className}`}
        style={{ cursor: "default" }}
      >
        <img
          src={leafLogo}
          alt="CarbonIQ Logo"
          style={{
            width: 72,
            height: 72,
            objectFit: "contain",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
          }}
        />
        <div className="flex flex-col items-center">
          <div className="flex items-baseline" style={{ lineHeight: 1 }}>
            <span style={{ color: "#ffffff", fontWeight: "bold", fontSize: "42pt", fontFamily: "Georgia, serif" }}>
              Carbon
            </span>
            <span style={{ color: "#97BC62", fontWeight: "bold", fontSize: "42pt", fontFamily: "Georgia, serif" }}>
              IQ
            </span>
          </div>
          <div
            style={{
              color: "#97BC62",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              marginTop: "8px",
            }}
          >
            AI Carbon Analytics
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

export default Logo;
