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
        /* Professional navy / blue / cyan palette */
        navy: {
          50: "hsl(220 30% 97%)",
          100: "hsl(220 30% 93%)",
          200: "hsl(218 33% 85%)",
          300: "hsl(216 33% 72%)",
          400: "hsl(214 35% 55%)",
          500: "hsl(213 36% 42%)",
          600: "hsl(212 38% 33%)",
          700: "hsl(211 40% 24%)",
          800: "hsl(210 42% 16%)",
          900: "hsl(209 44% 10%)",
          950: "hsl(222 84% 4.9%)",
        },
        blue: {
          50: "hsl(210 100% 97%)",
          100: "hsl(210 98% 93%)",
          200: "hsl(208 90% 83%)",
          300: "hsl(206 85% 70%)",
          400: "hsl(204 80% 55%)",
          500: "hsl(202 80% 45%)",
          600: "hsl(200 80% 38%)",
          700: "hsl(198 80% 31%)",
          800: "hsl(196 80% 26%)",
          900: "hsl(194 80% 22%)",
        },
        cyan: {
          50: "hsl(188 100% 97%)",
          100: "hsl(188 95% 90%)",
          200: "hsl(188 80% 80%)",
          300: "hsl(188 70% 65%)",
          400: "hsl(188 70% 50%)",
          500: "hsl(188 70% 38%)",
          600: "hsl(188 70% 31%)",
          700: "hsl(188 70% 26%)",
          800: "hsl(188 70% 22%)",
          900: "hsl(188 70% 18%)",
        },

        /* Semantic aliases — reference these in component classes */
        primary: "hsl(200 80% 38%)",
        primaryForeground: "hsl(0 0% 100%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(212 40% 8%)",
        card: "hsl(0 0% 100%)",
        cardForeground: "hsl(212 40% 8%)",
        secondary: "hsl(210 20% 96%)",
        secondaryForeground: "hsl(212 40% 10%)",
        muted: "hsl(210 20% 96%)",
        mutedForeground: "hsl(214 30% 45%)",
        accent: "hsl(188 70% 93%)",
        accentForeground: "hsl(200 80% 26%)",
        destructive: "hsl(0 84.2% 60.2%)",
        destructiveForeground: "hsl(210 40% 98%)",
        border: "hsl(214 32% 90%)",
        input: "hsl(214 32% 90%)",
        ring: "hsl(200 80% 38%)",
        radius: "0.5rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
