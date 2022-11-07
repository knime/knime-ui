require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    extends: ['@knime/eslint-config/vue3-typescript'],
    globals: {
        consola: false
    },
    env: {
        node: true
    },
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
