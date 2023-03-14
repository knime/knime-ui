module.exports = {
    extends: ['@knime/eslint-config/stylelint/vue', 'stylelint-prettier/recommended'],
    rules: {
        "at-rule-no-unknown": [true, {
            ignoreAtRules: ["define-mixin", "mixin"]
        }]
    }
}
