/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,html}",
    "./downloads/**/*.html",
    "./**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', 
        primaryHover: '#1d4ed8',
        dark: '#0f172a',
        light: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(37, 99, 235, 0.15)'
      }
    },
  },
  plugins: [],
}