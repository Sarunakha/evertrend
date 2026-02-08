/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#fab242',
          light: '#fab242',
          dark: '#d19c49',
        },
        accent: {
          gray: '#b4b4b4',
          light: '#f1f3f9',
          medium: '#c2c9d6',
        },
      },
    },
  },
  plugins: [],
}
