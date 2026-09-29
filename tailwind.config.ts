import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./admin-center/**/*.{js,ts,jsx,tsx,mdx}",
    "./creator-center/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "arata-primary": "var(--arata-primary)",
        "arata-accent": "var(--arata-accent)",
        "arata-danger": "var(--arata-danger)",
        "arata-muted": "var(--arata-muted)",
        "arata-green": "#00dc64",
        "arata-black": "#121212",
        "arata-dark": "#1e1e1e",
        "arata-gray": "#2a2a2a",
        "arata-text": "#e0e0e0",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
