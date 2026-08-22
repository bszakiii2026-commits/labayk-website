/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f8f2",
          100: "#dcedde",
          200: "#b8dabd",
          300: "#8dc196",
          400: "#5fa26d",
          500: "#3f8550",
          600: "#2f6a3f",
          700: "#275435",
          800: "#22432c",
          900: "#1d3826",
        },
        gold: {
          400: "#d9b35a",
          500: "#c69a3c",
          600: "#a87e2c",
        },
      },
      fontFamily: {
        sans: ["var(--font-tajawal)", "Tahoma", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
