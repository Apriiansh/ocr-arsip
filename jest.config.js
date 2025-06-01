const nextJest = require('next/jest');

// Menyediakan path ke Next.js app kamu untuk memuat next.config.js dan .env files di environment tes kamu
const createJestConfig = nextJest({
  dir: './',
});

// Konfigurasi kustom Jest yang akan ditambahkan
const customJestConfig = {
  // Tambahkan lebih banyak setup options sebelum setiap tes dijalankan
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Jika kamu punya file setup

  // Jika menggunakan TypeScript dengan path alias yang dikonfigurasi di tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Handle CSS imports (jika kamu mengimpor CSS langsung di komponen)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  testEnvironment: 'jest-environment-jsdom', // Menggunakan environment JSDOM untuk tes UI

  // Opsional: Jika kamu ingin setupFilesAfterEnv untuk jest-dom
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Opsional: Atur direktori mana saja yang akan di-cover oleh test coverage
  // collectCoverageFrom: [
  //   'app/**/*.{js,jsx,ts,tsx}',
  //   'components/**/*.{js,jsx,ts,tsx}',
  //   '!**/node_modules/**',
  //   '!**/.next/**',
  // ],
};

// createJestConfig diekspor seperti ini untuk memastikan next/jest dapat memuat konfigurasi Next.js app kamu dengan benar
module.exports = createJestConfig(customJestConfig);