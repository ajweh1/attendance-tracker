/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,}",
  ],
  theme: {
    extend: {
      colors: {
        'hot-pink': '#FF69B4',
        'bright-blue': '#6495ED',
        'sky-blue': '#87CEFA',
        'light-pink': '#FFB6C1',
        'cornflower-blue': '#6495ED', 
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}