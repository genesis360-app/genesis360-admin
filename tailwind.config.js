/** @type {import('tailwindcss').Config} */
// Design system "Genesis360 Internal System" (export de Stitch).
// Violeta primario #8B5CF6, verde de éxito/crecimiento #10B981, fondo gris claro,
// tipografía Inter, esquinas redondeadas (Modern SaaS / CRM-ERP denso).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B5CF6',
          50: '#f1f3ff',
          100: '#e9ddff',
          200: '#d0bcff',
          500: '#8B5CF6',
          600: '#6b38d4',
          700: '#5516be',
        },
        accent: { DEFAULT: '#10B981', 600: '#006c49' }, // verde: éxito / métricas de crecimiento
        tertiary: '#6366F1',                              // indigo: estados/categorías
        danger: { DEFAULT: '#ba1a1a', container: '#ffdad6' },
        ink: '#141b2b',          // on-surface (texto)
        muted: '#494454',        // on-surface-variant
        outline: '#cbc3d7',
        canvas: '#f9f9ff',       // background
        surface: {
          DEFAULT: '#ffffff',
          low: '#f1f3ff',
          mid: '#e9edff',
          high: '#e1e8fd',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '1rem',
        xl: '1.5rem',
      },
      boxShadow: {
        card: '0px 10px 15px -3px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
