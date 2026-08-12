/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Single flat accent scale — used only for primary actions, links,
        // active nav/tab state, and focus rings. No gradients, no glow.
        accent: {
          50: '#FBF3ED',
          100: '#F6E3D5',
          200: '#ECC7AD',
          300: '#DFA37E',
          400: '#D07F55',
          500: '#C2653A',
          600: '#A8502C',
          700: '#833D22',
          800: '#5F2C19',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        popover: '0 4px 16px -4px rgba(15, 23, 42, 0.12), 0 2px 6px -2px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
