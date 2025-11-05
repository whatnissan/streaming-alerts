/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        netflix: '#E50914',
        prime: '#00A8E1',
        hulu: '#1CE783',
        paramount: '#0064FF',
        hbo: '#8440C6',
        disney: '#113CCF',
        apple: '#000000',
      },
    },
  },
  plugins: [],
}
