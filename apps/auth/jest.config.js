module.exports = {
  testEnvironment: "jsdom",
  verbose: false,
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  transform: {
    "^.+\\.vue$": "@vue/vue3-jest",
    "^.+\\.svg": "<rootDir>/scripts/jest-string-transformer.js",
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.tsx?$": ["ts-jest", {}],
  },
  transformIgnorePatterns: ["node_modules/(?!hackathon-demo)/"],
  testMatch: [
    "<rootDir>/src/**/*.spec.ts",
    "<rootDir>/tests/unit/**/*.ts",
    "<rootDir>/__tests__/**/*.ts",
  ],
  moduleFileExtensions: ["js", "ts", "vue"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/"],
  coverageReporters: ["text", "json-summary"],
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
};
