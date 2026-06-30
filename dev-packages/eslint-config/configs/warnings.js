module.exports = [
    {
        name: '@eclipse-glsp/warnings',
        rules: {
            // https://eslint.org/docs/rules/
            curly: 'warn',
            'no-invalid-this': 'warn',
            'no-new-wrappers': 'warn',
            'no-return-await': 'warn',
            'no-redeclare': 'off',
            'no-shadow': 'off',
            'no-void': 'warn',
            'prefer-const': [
                'warn',
                {
                    destructuring: 'all'
                }
            ],
            'prefer-object-spread': 'warn',
            radix: 'warn',
            'spaced-comment': [
                'warn',
                'always',
                {
                    exceptions: ['*', '+', '-', '/', '!']
                }
            ],
            'use-isnan': 'warn',

            // Formatting rules → @stylistic (moved from core ESLint and @typescript-eslint)
            '@stylistic/brace-style': 'off',
            '@stylistic/comma-dangle': 'warn',
            '@stylistic/eol-last': 'warn',
            '@stylistic/no-multiple-empty-lines': [
                'warn',
                {
                    max: 1
                }
            ],
            '@stylistic/no-trailing-spaces': 'warn',
            '@stylistic/space-before-function-paren': [
                'warn',
                {
                    anonymous: 'always',
                    named: 'never',
                    asyncArrow: 'always'
                }
            ],
            '@stylistic/max-len': [
                'warn',
                {
                    code: 140
                }
            ],
            '@stylistic/arrow-parens': ['warn', 'as-needed'],
            '@stylistic/semi': ['warn', 'always'],
            '@stylistic/quotes': [
                'warn',
                'single',
                {
                    avoidEscape: true
                }
            ],
            '@stylistic/type-annotation-spacing': 'warn',

            // @typescript-eslint/eslint-plugin
            '@typescript-eslint/explicit-function-return-type': [
                'warn',
                {
                    allowExpressions: true
                }
            ],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/no-shadow': 'warn',

            // eslint-plugin-import-x (renamed from import/)
            // Reports cross-module use of `@deprecated` exports. Preferred over
            // `@typescript-eslint/no-deprecated`, which also flags internal/local use of members that
            // are intentionally kept for backwards compatibility — and is noticeably slower to run.
            'import-x/no-deprecated': 'warn'
        }
    }
];
