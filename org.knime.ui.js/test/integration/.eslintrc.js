module.exports = {
    overrides: [
        {
            // JsDocs
            files: ['./**/*'],
            rules: {
                'valid-jsdoc': ['warn', {
                    requireReturn: false
                }]
            }
        },
        {
            // Tests
            files: ['./suites/**/*.test.js'],
            rules: {
                'no-undef': 'off',
                'new-cap': 'off',
                'no-use-before-define': 'off',
                'no-unused-expressions': 'off',
                'padding-line-between-statements': [
                    'error',
                    { blankLine: 'always', prev: '*', next: 'multiline-expression' }
                ],
                'no-multiple-empty-lines': [2, { max: 1 }]
            }
        },
        {
            // Plugins
            files: ['./plugins/*.js'],
            rules: {
                'no-undef': 'off'
            }
        }
    ]
};
