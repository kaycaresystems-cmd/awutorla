/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Luxury Brand Accent scale — Velvet Burgundy through Terracotta
        accent: {
          50: '#FDF6F3',
          100: '#F9E9E3',
          200: '#F3D0C4',
          300: '#E6A896',
          400: '#D3765A',
          500: '#B84B2E',
          600: '#8E2C1A',
          700: '#6B1D12',
          800: '#4E0C17',
          900: '#35070F',
          950: '#1F0208',
        },
        // Ghanaian Imperial Gold & Champagne highlights
        gold: {
          50: '#FCF9EE',
          100: '#F8F1D4',
          200: '#EFE1A3',
          300: '#E5CD6B',
          400: '#D8B539',
          500: '#D4AF37',
          600: '#B48C21',
          700: '#8F6B1A',
          800: '#6E5018',
          900: '#533D17',
        },
        // Refined warm neutrals for cards, borders, and text
        gray: {
          50: '#FAF8F6',
          100: '#F3EFEB',
          200: '#E6DFD9',
          300: '#D3C8BF',
          400: '#A4968C',
          500: '#7A6D63',
          600: '#5A4E46',
          700: '#403630',
          800: '#2A221E',
          900: '#191412',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(78, 12, 23, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        luxury: '0 12px 32px -12px rgba(78, 12, 23, 0.09), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'luxury-hover': '0 20px 48px -16px rgba(78, 12, 23, 0.16), 0 6px 18px -3px rgba(212, 175, 55, 0.12)',
        'gold-glow': '0 0 24px -4px rgba(212, 175, 55, 0.28)',
        popover: '0 20px 45px -10px rgba(78, 12, 23, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
