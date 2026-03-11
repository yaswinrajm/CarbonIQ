/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primaryDark: "#1A2E1A",
        forest: "#2C5F2D",
        mediumGreen: "#4A8C4B",
        accentLime: "#97BC62",
        lightBg: "#F4F9F0",
        textDark: "#1E293B",
        textGray: "#64748B",
        danger: "#EF4444",
        warning: "#F59E0B",
        good: "#22C55E",
      },
    },
  },
  plugins: [],
};

