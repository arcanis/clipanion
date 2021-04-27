module.exports = {
  extends: [
    `@yarnpkg`,
    `@yarnpkg/eslint-config/react`,
  ],
  ignorePatterns: [
    `tests/__snapshots__`,
  ],
  env: {
    browser: true,
    node: true,
  },
};
