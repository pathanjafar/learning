import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1020",
        panel: "#11172b",
        accent: "#6366f1",
      },
    },
  },
  plugins: [],
} satisfies Config;
