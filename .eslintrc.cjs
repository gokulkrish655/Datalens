module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'next/core-web-vitals'],
  rules: {
    'no-console': 'off',
    semi: ['error', 'always'],
    quotes: ['error', 'single', { avoidEscape: true }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-useless-escape': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};
