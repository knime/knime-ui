module.exports = {
    preset: '@vue/cli-plugin-unit-jest',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^~/(.*)$': '<rootDir>/$1',
        '~api': '<rootDir>/api/index.js'
    },
    transform: {
        '\\.mjs$': 'babel-jest',
        '\\.js$': 'babel-jest',
        '\\.vue$': '@vue/vue2-jest',
        '\\.(css|styl|less|sass|scss|ttf|woff|woff2)(\\?|$)': 'jest-transform-stub',
        '\\.svg': '<rootDir>/test/unit/jest-transform-svgs'
    },
    transformIgnorePatterns: [
        '/node_modules/'
    ],
    reporters: ['default', ['jest-junit', { outputDirectory: './coverage', reportTestSuiteErrors: true }]],
    coverageReporters: ['lcov', 'text'],
    // keep in sync with sonar-project.properties!
    collectCoverageFrom: [
        '<rootDir>/**/*.{js,vue}',
        '!config.js',
        '!**/*.config.js',
        '!.eslintrc*.js',
        '!**/.eslintrc*.js',
        '!.stylelintrc.js'
    ],
    coveragePathIgnorePatterns: [
        '^<rootDir>/(.nuxt|coverage|dist|test|target|node_modules|bin|webapps-common|' +
                    'buildtools|knime-ui-extension-service|.history)/'
    ],
    watchPathIgnorePatterns: [
        '^<rootDir>/(.nuxt|coverage|dist|target|node_modules|bin|webapps-common|knime-ui-extension-service|.history)/'
    ],
    testEnvironment: 'jsdom',
    testURL: 'http://test.example/',
    testMatch: [
        '<rootDir>/**/__tests__/*.test.js'
    ],
    setupFiles: ['<rootDir>/test/unit/jest-setup', 'jest-useragent-mock']
};
