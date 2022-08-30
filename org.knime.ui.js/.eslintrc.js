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
                    ['@', '.'],
                    ['webapps-common', './webapps-common']
                ],
                extensions: ['.vue', '.js', '.config.js']
            }
        }
    },
    overrides: [
        {
            files: ['./**/__tests__/*.test.js'],
            extends: ['./webapps-common/lint/.eslintrc-jest.js'],
            env: {
                node: true
            }
        }
    ]
};
