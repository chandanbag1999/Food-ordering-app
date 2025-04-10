module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.js', '**/tests/**', '**/setup.js'] }],
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
    'no-param-reassign': ['error', { props: false }],
    'max-len': ['error', { code: 120 }],
    'comma-dangle': ['error', 'only-multiline'],
    'consistent-return': 'off',
    'func-names': 'off',
    'linebreak-style': 'off',
    'arrow-parens': ['error', 'as-needed'],
    'prefer-destructuring': ['error', { object: true, array: false }],
    'no-unused-vars': ['error', { argsIgnorePattern: 'next|req|res|err' }],
  },
}; 