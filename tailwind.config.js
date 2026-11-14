/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    /**
     * Declared in full rather than via `extend` so the breakpoint order is
     * explicit: a custom breakpoint merged into the defaults can be emitted
     * after `xl`, which would let `xs:` rules win on wide screens. Values
     * below `xs` are Tailwind's own defaults.
     */
    screens: {
      // 2 columns start here; see components/destinations/DestinationGrid.js
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        space: '#07080a', ink: '#0e1014', line: 'rgba(255,255,255,0.09)', accent: '#e8884a', measured: '#5fd0a0', derived: '#6cb6f5', interpreted: '#e9c46a', simulated: '#b79cf2',
        // Brand ramp sampled from the A-ROUTE wordmark gradient (see lib/brand.js).
        mars: {
          50: '#FDF3E6',
          100: '#FBC361',
          200: '#F5AC3E',
          300: '#E8832B',
          400: '#C8521F',
          500: '#95331A',
          600: '#6F2512',
          700: '#4D1A0D',
          800: '#2A0E07',
          900: '#140604',
        },
        bone: {
          DEFAULT: '#EFE7DF',
          dim: '#9C9289',
        },
        void: '#000000',
      },
      fontFamily: {
        // 'Artemus' is loaded via @font-face in app/globals.css.
        artemus: ['Artemus', 'var(--font-fallback)'],
        sans: ['var(--font-fallback)'],
      },
      letterSpacing: {
        ultra: '0.42em',
        mega: '0.58em',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'line-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        'line-sweep': 'line-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'soft-pulse': 'soft-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
