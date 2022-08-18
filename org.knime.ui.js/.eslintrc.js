module.exports = {
    extends: ['./webapps-common/lint/.eslintrc-vue.js'],
    globals: {
        consola: false
    },
    env: {
        node: true
    },
    ignorePatterns: ['knime-ui-extension-service/']
};
