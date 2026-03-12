/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primaryDark: "#020617", // slate-950
        forest: "#064E3B",     // emerald-900
        mediumGreen: "#059669",// emerald-600
        accentLime: "#34D399", // emerald-400
        lightBg: "#0B1121",    // very dark slate for background
        textDark: "#F8FAFC",   // light text
        textGray: "#94A3B8",   // gray text
        danger: "#EF4444",
        warning: "#F59E0B",
        good: "#10B981",
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      }
    },
  },
  plugins: [],
};
