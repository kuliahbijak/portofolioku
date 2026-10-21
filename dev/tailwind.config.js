/**
 * Konfigurasi Tailwind (hanya untuk membangun ulang css/app.css — tidak dimuat di browser).
 * Token diambil dari DESIGN.md "Creative Studio & Portfolio".
 * Warna merek memakai CSS variable agar "Warna utama" di Pengaturan bisa diganti tanpa build ulang.
 *
 * Bangun ulang (opsional, hanya bila Anda menambah class Tailwind baru):
 *   npx tailwindcss@3.4.17 -c dev/tailwind.config.js -i dev/app.src.css -o css/app.css --minify
 */
const SANS = ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'];
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;
module.exports = {
  content: ['./index.html', './admin.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#0B1F3A', 'text-primary': '#0B1F3A', 'text-secondary': '#5B6472',
        'brand-blue': v('--c-brand'), 'primary': v('--c-brand-dark'), 'primary-container': v('--c-brand'),
        'bright-blue': v('--c-bright'), 'band-blue': v('--c-band'),
        'yellow-accent': '#FFC300', 'yellow-hover': '#F59E0B', 'accent-orange': '#C96F00',
        'warm-cream': '#FDF8F0', 'light-blue-tint': '#EAF3FF', 'surface-white': '#FFFFFF', 'soft-yellow': '#FFF6D4',
        'border-subtle': '#E2E8F0', 'input-bg': '#F8FAFC',
        'surface': '#f8f9ff', 'surface-bright': '#f8f9ff', 'surface-dim': '#d2daeb', 'background': '#f8f9ff',
        'surface-container-lowest': '#ffffff', 'surface-container-low': '#eff4ff', 'surface-container': '#e5eeff',
        'surface-container-high': '#e0e9f9', 'surface-container-highest': '#dae3f4', 'surface-variant': '#dae3f4',
        'on-surface': '#131c28', 'on-surface-variant': '#434655', 'outline': '#737686', 'outline-variant': '#c3c6d7',
        'secondary': '#4d5f7d', 'secondary-container': '#c8dbfe', 'on-secondary-container': '#4e607e', 'secondary-fixed-dim': '#b5c7ea',
        'tertiary': '#6c5100', 'tertiary-container': '#8a6800', 'tertiary-fixed-dim': '#f8be00',
        'primary-fixed': '#dbe1ff', 'primary-fixed-dim': '#b4c5ff',
        'error': '#ba1a1a', 'error-container': '#ffdad6', 'on-error-container': '#93000a',
        'success': '#047857', 'success-container': '#E8F8F0'
      },
      borderRadius: { DEFAULT: '1rem', lg: '2rem', xl: '3rem', card: '20px', full: '9999px' },
      spacing: {
        'space-xs': '0.25rem', 'space-sm': '0.5rem', 'space-md': '1rem', 'space-lg': '1.5rem', 'space-xl': '2.5rem',
        'space-2xl': '4rem', 'space-3xl': '6rem', 'gutter': '1.5rem', 'gutter-mobile': '1rem',
        'margin': '2rem', 'margin-mobile': '1.25rem', 'margin-desktop': '5rem'
      },
      fontFamily: Object.assign({
        sans: SANS,
        hand: ['Caveat', '"Segoe Print"', 'cursive']
      }, Object.fromEntries(['display-hero', 'display-hero-mobile', 'headline-lg', 'headline-lg-mobile', 'headline-md', 'headline-sm', 'body-lg', 'body-md', 'body-sm', 'label-caps', 'label-ui', 'caption'].map((k) => [k, SANS]))),
      fontSize: {
        'display-hero': ['56px', { lineHeight: '68px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-hero-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '700' }],
        'label-ui': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '500' }]
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(11,31,58,0.05)',
        'lift': '0 12px 30px -4px rgba(11,31,58,0.14)',
        'float': '0 20px 40px -8px rgba(11,31,58,0.12)',
        'nav': '0 1px 8px rgba(11,31,58,0.06)',
        'pill': '0 4px 14px rgba(11,31,58,0.06)',
        'blue': '0 6px 20px rgb(var(--c-brand) / 0.28)',
        'yellow': '0 4px 14px rgba(255,195,0,0.35)'
      },
      maxWidth: { content: '1200px' }
    }
  },
  plugins: []
};
