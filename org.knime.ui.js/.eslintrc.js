module.exports = {
    extends: ['./webapps-common/lint/.eslintrc-nuxt.js'],
    globals: {
        consola: true
    },
    overrides: [
        {
            files: ['{build}/**'],
            env: {
                node: true
            }
        }
    ]
};
