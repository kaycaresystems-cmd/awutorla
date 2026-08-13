/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand accent scale — terracotta through burgundy (Frosted Atelier
        // direction). Used for primary actions, links, active nav/tab state,
        // focus rings, and heading color.
        accent: {
          50: '#FBEDE8',
          100: '#F4D3C7',
          200: '#E7AC93',
          300: '#D68664',
          400: '#C8724E',
          500: '#BB6142',
          600: '#96432B',
          700: '#7A2E1E',
          800: '#5A0117',
        },
        // gray-200 is used throughout as the default card/panel border — tint
        // it warm (burgundy-tinted hairline) instead of neutral, per the
        // approved glass direction, without having to touch every className.
        gray: {
          50: '#FAFAFA',
          100: '#F2F0EF',
          200: '#E4DEDC',
          300: '#D2C9C6',
          400: '#A79D9B',
          500: '#7D7573',
          600: '#5C5456',
          700: '#443C3E',
          800: '#2E2426',
          900: '#241A1C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(90, 1, 23, 0.05)',
        popover: '0 4px 16px -4px rgba(90, 1, 23, 0.16), 0 2px 6px -2px rgba(90, 1, 23, 0.08)',
      },
      // "No rounded edges" — zero out every radius key used across the app
      // rather than hand-editing every rounded-* className.
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
    },
  },
  plugins: [],
}
