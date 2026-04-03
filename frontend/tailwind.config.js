/** @type {import('tailwindcss').Config} */
const monochrome = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        black: '#000000',
        white: '#ffffff',
        slate: monochrome,
        gray: monochrome,
        zinc: monochrome,
        neutral: monochrome,
        stone: monochrome,
        red: monochrome,
        orange: monochrome,
        amber: monochrome,
        yellow: monochrome,
        lime: monochrome,
        green: monochrome,
        emerald: monochrome,
        teal: monochrome,
        cyan: monochrome,
        sky: monochrome,
        blue: monochrome,
        indigo: monochrome,
        violet: monochrome,
        purple: monochrome,
        fuchsia: monochrome,
        pink: monochrome,
        rose: monochrome,
      }
    },
  },
  plugins: [],
}
