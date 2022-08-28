/**
 * @type {import('jest').Config}
 */
const config = {
  rootDir: __dirname,
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  setupFilesAfterEnv: [
    './scripts/jest-env.ts'
  ],
  globals: {
    __DEV__: true,
    __TEST__: true,
    __BROWSER__: false,
    __GLOBAL__: false,
    __ESM_BUNDLER__: true,
    __ESM_BROWSER__: false,
    __NODE_JS__: true,
    __SSR__: true,
    __VERSION__: require('./package.json').version,

    'ts-jest': {
      tsconfig: {
        target: 'esnext',
        sourceMap: true
      }
    }
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'lcov', 'text'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/sfc-playground/**',
    // only used as a build entry
    '!packages/vue/src/runtime.ts',
    // mostly just entries
    '!packages/vue-compat/**'
  ],
  // moduleDirectories: ['node_modules', 'packages'],
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/.git/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@view-js/(.*?)$': '<rootDir>/packages/$1/src',
    'view-js': '<rootDir>/packages/view-js/src',
  },
  testMatch: [
    '<rootDir>/packages/**/__tests__/**/*spec.[jt]s?(x)'
  ],
  testPathIgnorePatterns: process.env.SKIP_E2E
    ? // ignore example tests on netlify builds since they don't contribute
    // to coverage and can cause netlify builds to fail
    ['/node_modules/', '/examples/__tests__']
    : ['/node_modules/']
}

module.exports = config
