module.exports = {
  testEnvironment: 'jsdom',
  verbose: false,
  setupFilesAfterEnv: ['<rootDir>/../../jest-setup.ts'],

  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': [
      'ts-jest',
      {},
    ],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)$',
  moduleFileExtensions: [
      'js',
      'ts',
    ],
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/tests/',
    ],
    coverageReporters: [
      'text',
      'json-summary',
    ],
    testEnvironmentOptions: {
      customExportConditions: [
        'node',
        'node-addons',
      ],
    },
  }
