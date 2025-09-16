export default {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["js", "json"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupJest.js"],
  collectCoverage: false
};
