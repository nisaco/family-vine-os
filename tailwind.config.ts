import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        choir: {
          50: "#faf5f5",
          100: "#f5ebeb",
          200: "#edd8d9",
          300: "#deb9bc",
          400: "#c78f94",
          500: "#ae6870",
          600: "#8e464f",
          700: "#74353d",
          800: "#602d34",
          900: "#50292f",
          950: "#2d1216",
        },
        gold: {
          50: "#faf8f2",
          100: "#f3ede0",
          200: "#e6d7bc",
          300: "#d6bc92",
          400: "#c69f68",
          500: "#b58444",
          600: "#9e6c37",
          700: "#7e522d",
          800: "#67432a",
          900: "#553825",
          950: "#2f1d12",
        },
        surface: {
          base: "#fdfbf7",
          card: "#ffffff",
          muted: "#f7f5f0",
          border: "#e8e5de",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;

