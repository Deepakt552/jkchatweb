/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
    './storage/framework/views/*.php',
    './resources/views/**/*.blade.php',
    './resources/js/**/*.tsx',
    './resources/js/**/*.ts',
  ],
  theme: {
    extend: {
      colors: {
        dia: {
          navy: '#20324A',
          blue: '#2788E8',
          'blue-hover': '#1F73C9',
          'blue-light': '#EAF4FF',
          teal: '#32C2A3',
          'teal-light': '#E9FAF5',
          background: '#F5F7FA',
          border: '#E3E8EF',
          text: '#20324A',
          muted: '#64748B',
          placeholder: '#94A3B8',
          received: '#F0F3F7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    }
  },
  plugins: [],
};
