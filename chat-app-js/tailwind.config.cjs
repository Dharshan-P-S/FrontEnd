/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light Mode Colors
        'light-bg': '#F7F7F7', // Soft, neutral background
        'light-container': '#FFFFFF',
        'light-accent': '#0084FF', // Primary accent
        'light-text': '#333333',
        'light-text-secondary': '#6B7280',
        'light-border': '#E5E7EB',
        
        // Dark Mode Colors
        'dark-bg': '#121212', // Dark background
        'dark-container': '#1E1E1E',
        'dark-accent': '#0A84FF',
        'dark-text': '#E0E0E0',
        'dark-text-secondary': '#9CA3AF',
        'dark-border': '#374151',

        // Sent message bubble colors
        'sent-light': '#D9FDD3',
        'sent-dark': '#056162',
      }
    },
  },
  plugins: [],
}