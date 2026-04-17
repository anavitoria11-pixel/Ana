/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        'bg-subtle': '#F7F7F5',
        'text-primary': '#191919',
        'text-light': '#6B6B6B',
        border: '#E8E8E5',
        'border-dark': '#D4D4D0',
        accent: '#2EAADC',
        correct: '#4DAB6D',
        incorrect: '#EB5757',
        hover: '#F1F1EF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '720px',
      },
      borderRadius: {
        sm: '4px',
      },
    },
  },
  plugins: [],
}
