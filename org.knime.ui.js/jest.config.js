module.exports = {
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^~/(.*)$': '<rootDir>/$1',
        '^vue$': 'vue/dist/vue.common.js'
    },
    moduleFileExtensions: [
        'js',
        'vue',
        'json'
    ],
    transform: {
        '\\.js$': 'babel-jest',
        '\\.vue$': 'vue-jest',
        '\\.(css|styl|less|sass|scss|ttf|woff|woff2)(\\?|$)': 'jest-transform-stub',
        '\\.svg': '<rootDir>/test/unit/jest-transform-svgs'
    },
    transformIgnorePatterns: [
        '/node_modules/'
    ],
    reporters: ['default', ['jest-junit', { outputDirectory: './coverage' }]],
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
        '^<rootDir>/(coverage|dist|test|target|node_modules|bin|webapps-common)/'
    ],
    watchPathIgnorePatterns: [
        '^<rootDir>/(coverage|dist|target|node_modules|bin|webapps-common)/'
    ],
    testURL: 'http://test.example/',
    testMatch: [
        '<rootDir>/test/unit/**/*.test.js'
    ],
    setupFiles: ['<rootDir>/test/unit/jest-setup'],
    globals: {
        'vue-jest': {
            hideStyleWarn: true
        }
    }
};
