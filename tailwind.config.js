/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#DC143C',
          pink: '#FF69B4',
          black: '#1A1A1A',
          'red-dark': '#B01030',
          'pink-light': '#FFB6D9',
        },
      },
    },
  },
  plugins: [],
};
