require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    extends: ['@knime/eslint-config/vue3-typescript'],
    globals: {
        consola: false
    },
    ignorePatterns: [
        'generated-api.ts'
    ],
    env: {
        node: true
    },
    ignorePatterns: [
        'knime-js-pagebuilder/'
    ],
    settings: {
        'import/resolver': {
            alias: {
                map: [
                    ['@', './src']
                ]
            }
        }
    },
    overrides: [
        {
            files: ['./**/__tests__/*.test.js'],
            extends: ['@knime/eslint-config/jest'],
            rules: {
                'no-magic-numbers': 0
            }
        }
    ]
};
