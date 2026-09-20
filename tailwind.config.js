/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#155fe0',
        'brand-cyan': '#0891b2',
        'nav': '#0a1628',
        'background': '#f3f6fb',
        'surface': '#ffffff',
      },
    },
  },
  plugins: [],
}

