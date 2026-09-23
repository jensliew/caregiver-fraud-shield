/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bg: '#faf6ef',
        surface: '#ffffff',
        ink: '#201c16',
        'ink-muted': '#6e6656',
        border: '#e2d9c7',
        accent: '#c8102e',
        'accent-soft': '#f6dadd',
        // OCBC's primary action bar is a deep slate, not the brand red —
        // the red is reserved for the signature corner curve and accents.
        slate: '#2f3a44',
        'slate-hover': '#26303a',
        success: '#2e7d57',
        'success-soft': '#e1f0e7',
        warn: '#9c6608', // darkened from a lighter value that only cleared the 3:1
        // large-text contrast minimum by 0.06 — too thin a margin
        'warn-soft': '#f6e8d2',
        'tile-balance': '#2e7d57',
        'tile-balance-soft': '#dceee3',
        'tile-add': '#3e6fa6',
        'tile-add-soft': '#dce6f3',
        'tile-pay': '#c8102e',
        'tile-pay-soft': '#f6dadd',
        'tile-help': '#8a5cb8',
        'tile-help-soft': '#e7dbf3',
        'header-tint-from': '#fbe3e3',
      },
      fontSize: {
        xs: '0.8125rem',
        sm: '0.9375rem',
        base: ['1.25rem', { lineHeight: '1.5' }], // ~20px — the app's reading size
        lg: '1.5rem', // tile labels, button text, key instructions
        xl: '1.75rem', // screen headings
        '2xl': '2.25rem', // hero balance figure
      },
      boxShadow: {
        sm: '0 1px 2px rgba(32, 28, 22, 0.07)',
        DEFAULT: '0 4px 14px rgba(32, 28, 22, 0.09)',
        md: '0 4px 14px rgba(32, 28, 22, 0.09)',
        lg: '0 10px 28px rgba(32, 28, 22, 0.12)',
      },
      minHeight: {
        tap: '48px', // WCAG 2.5.5 minimum touch target
      },
      minWidth: {
        tap: '48px',
      },
    },
  },
  plugins: [],
};
