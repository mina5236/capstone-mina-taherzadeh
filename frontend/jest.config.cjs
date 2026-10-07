module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.jsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/tests/styleMock.cjs',
  },
}