/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        body: ['Karla', 'system-ui', 'sans-serif'],
      },
      colors: {
        earth: {
          page: '#F5EFE6',
          ink: '#2C1A0E',
          mid: '#6B4A30',
          light: '#9E7A5A',
          rule: '#EAE0D0',
          sand: '#EDE3D4',
          rust: '#C0522A',
          amber: '#C48A2A',
          sage: '#5A7A40',
        },
      },
    },
  },
  plugins: [],
}