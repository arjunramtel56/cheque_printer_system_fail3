import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "hsl(221.2 83.2% 53.3%)",
        primaryForeground: "hsl(210 40% 98%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 84% 4.9%)",
        card: "hsl(0 0% 100%)",
        cardForeground: "hsl(222.2 84% 4.9%)",
        secondary: "hsl(210 40% 96.1%)",
        secondaryForeground: "hsl(222.2 47.4% 11.2%)",
        muted: "hsl(210 40% 96.1%)",
        mutedForeground: "hsl(215.4 16.3% 46.9%)",
        accent: "hsl(210 40% 96.1%)",
        accentForeground: "hsl(222.2 47.4% 11.2%)",
        destructive: "hsl(0 84.2% 60.2%)",
        destructiveForeground: "hsl(210 40% 98%)",
        border: "hsl(214.3 31.8% 91.4%)",
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(221.2 83.2% 53.3%)",
        radius: "0.5rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
