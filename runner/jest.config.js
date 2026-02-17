module.exports = {
  roots: ["<rootDir>/test"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testMatch: ["<rootDir>/test/**/*.(j|t)est.(ts|ts)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  coverageDirectory: "test-coverage",
  testPathIgnorePatterns: ["__tests__/helpers"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 78,
      lines: 89,
      statements: 89,
    },
  },
};
