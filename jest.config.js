module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // jsdom 28 pulls in ESM-only deps (@exodus/*, @csstools/*, parse5) — downlevel them to CJS
  transformIgnorePatterns: ['/node_modules/(?!.*(@exodus|@csstools|parse5)/)'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'json', 'node'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.m?js$': '<rootDir>/jest.esm-transformer.js'
  },
  collectCoverageFrom: [
    'src/**/*.ts'
  ]
}
