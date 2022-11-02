module.exports = {
    extends: ['stylelint-config-recommended-vue', '@knime/eslint-config/stylelint/vue'],
    rules: {
        "at-rule-no-unknown": [true, {
            ignoreAtRules: ["define-mixin", "mixin"]
        }]
    }
}
