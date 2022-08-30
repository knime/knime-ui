module.exports = {
    extends: ['./webapps-common/lint/.eslintrc-vue.js'],
    globals: {
        consola: false
    },
    env: {
        node: true
    },
    ignorePatterns: ['knime-ui-extension-service/'],
    settings: {
        'import/resolver': {
            alias: {
                map: [
                    ['@', './src']
                ],
                extensions: ['.vue', '.js', '.config.js']
            }
        }
    },
    overrides: [
        {
            files: ['./**/*.js', './**/*.mjs', './**/*.vue'],
            rules: {
                'import/extensions': ['error', { vue: 'always', json: 'always', mjs: 'always', svg: 'always' }]
            }
        },
        {
            files: ['./**/__tests__/*.test.js'],
            extends: ['./webapps-common/lint/.eslintrc-jest.js'],
            env: {
                node: true
            }
        }
    ]
};
