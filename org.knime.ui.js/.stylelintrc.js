module.exports = {
    extends: [
        '@knime/eslint-config/stylelint/vue',
        'stylelint-config-prettier'
    ],
    rules: {
        "at-rule-no-unknown": [true, {
            ignoreAtRules: ["define-mixin", "mixin"]
        }]
    }
}
