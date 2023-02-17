module.exports = {
  root: true,
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
  overrides: [{
    files: [`*.ts`, `*.tsx`],
    parserOptions: {
      project: [`./tsconfig.json`],
      tsconfigRootDir: __dirname,
    },
    rules: {
      [`@typescript-eslint/consistent-type-exports`]: 2,
      [`@typescript-eslint/consistent-type-imports`]: 2,
    },
  }],
};
