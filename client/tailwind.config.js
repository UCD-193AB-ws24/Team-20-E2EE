const plugin = require('tailwindcss/plugin');

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}', // Adjust this path based on your project structure
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        'ucd-blue': {
          50: '#E6EDF4',
          100: '#CDD6E0',
          200: '#B3C1D1',
          300: '#9AADC2',
          400: '#8198B2',
          500: '#6884A3',
          600: '#4F7094',
          700: '#355B85',
          800: '#1D4776',
          900: '#033266',
          DEFAULT: '#022851',
          light: '#F0F4FA',
        },
        'ucd-gold': {
          100: '#FFF9E5',
          200: '#FFF2CC',
          300: '#FFECB2',
          400: '#FFE599',
          500: '#FFDF80',
          600: '#FFD966',
          700: '#FFD24C',
          800: '#FFCC33',
          900: '#FFC519',
          DEFAULT: '#FFBF00',
        },
        'ucd-black': {
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#B2B2B2',
          400: '#999999',
          500: '#7F7F7F',
          600: '#666666',
          700: '#4C4C4C',
          800: '#333333',
          900: '#191919',
          DEFAULT: '#000000',
        },
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.passkey-custom-theme': {
          '--cb-box-color': '#3f465d',
          '--cb-primary-color-hover': '#1145df80',
          '--cb-primary-color-disabled': '#6f7486',
          '--cb-script-text-color': '#d0d9f5',
          '--cb-box-color-hover': '#525d83',
        },
      });
    }),
  ],
};