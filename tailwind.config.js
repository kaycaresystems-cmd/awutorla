/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Near-black charcoal — reference dashboard's primary dark fill
        charcoal: {
          50: '#F5F5F6',
          100: '#E7E7E9',
          200: '#C7C7CB',
          300: '#9F9FA6',
          400: '#6E6E76',
          500: '#48484F',
          600: '#333338',
          700: '#232326',
          800: '#18181A',
          900: '#101011',
          950: '#0B0B0C',
        },
        // Mustard/amber — reference dashboard's warm accent
        mustard: {
          50: '#FFF8E6',
          100: '#FDECBE',
          200: '#FBDD8C',
          300: '#F8CD5C',
          400: '#F5C244',
          500: '#EDAE1F',
          600: '#C68C15',
          700: '#9C6C12',
          800: '#77500F',
          900: '#6B4A05',
        },
        // Warm cream surface — distinct from the cooler page backdrop
        cream: {
          50: '#FFFFFF',
          100: '#FEFCF7',
          200: '#FAF5EA',
          300: '#F0E8D6',
        },
        // Compatibility aliases: existing `accent-*`/`gold-*` classes across the app
        // repaint to the new palette without touching every file. Slated for a
        // future grep-replace cleanup once the reskin has landed.
        accent: {
          50: '#F5F5F6',
          100: '#E7E7E9',
          200: '#C7C7CB',
          300: '#9F9FA6',
          400: '#6E6E76',
          500: '#48484F',
          600: '#333338',
          700: '#232326',
          800: '#18181A',
          900: '#101011',
          950: '#0B0B0C',
        },
        gold: {
          50: '#FFF8E6',
          100: '#FDECBE',
          200: '#FBDD8C',
          300: '#F8CD5C',
          400: '#F5C244',
          500: '#EDAE1F',
          600: '#C68C15',
          700: '#9C6C12',
          800: '#77500F',
          900: '#6B4A05',
        },
        // Cooler, cleaner neutrals for borders/secondary text and the page backdrop
        gray: {
          50: '#FAFAFA',
          100: '#F1F1F2',
          200: '#E4E4E6',
          300: '#D0D0D3',
          400: '#A3A3A8',
          500: '#797980',
          600: '#5A5A61',
          700: '#404046',
          800: '#28282C',
          900: '#18181B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(16, 16, 17, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        luxury: '0 12px 32px -12px rgba(16, 16, 17, 0.10), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'luxury-hover': '0 16px 36px -14px rgba(16, 16, 17, 0.14), 0 5px 14px -3px rgba(0, 0, 0, 0.05)',
        'gold-glow': '0 2px 8px -2px rgba(16, 16, 17, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        popover: '0 20px 45px -10px rgba(16, 16, 17, 0.16), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
        'mega-card': '0 24px 64px -20px rgba(16, 16, 17, 0.18), 0 8px 20px -6px rgba(0, 0, 0, 0.06)',
        pill: '0 2px 6px -1px rgba(16, 16, 17, 0.12)',
      },
    },
  },
  plugins: [],
}
