import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        crypto: 'readonly',
        // Browser globals for Puppeteer page.evaluate() context
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        Plugin: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrors': 'none'
      }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'arrow-spacing': ['error', {
        'before': true, 'after': true
      }],
      'quotes': ['error', 'single', {
        'avoidEscape': true, 'allowTemplateLiterals': true
      }],
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': 'error',
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always'],
      'space-before-function-paren': ['error', {
        'anonymous': 'never',
        'named': 'never',
        'asyncArrow': 'always'
      }],
      'no-unreachable': 'off',
      'no-extra-semi': 'off'
    },
    ignores: ['node_modules/**', 'dashboard/**', 'data/**', '*.log']
  }
]