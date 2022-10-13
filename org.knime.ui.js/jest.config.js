const coverageIgnoreFolders = [
    'coverage',
    'dist',
    'src/test',
    'target',
    'node_modules',
    'bin',
    'webapps-common',
    'buildtools',
    '.history'
];

const coverageIgnoreFiles = [
    // jest's coverage provider 'v8' uses node's V8 builtin code coverage
    // https://jestjs.io/docs/configuration#coverageprovider-string
    // and this uses different ignore comments than istanbul reporters
    // https://jestjs.io/docs/configuration#collectcoverage-boolean
    // However, for some reason these ignore comments don't seem to work properly
    // so we ignore specific files in here for now
    'src/main.js',
    'src/router/index.js',
    'src/plugins/index.js',
    'src/plugins/constants.js',
    'src/store/index.js'
];

module.exports = {
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '@api': '<rootDir>/src/api/index.js'
    },
    moduleFileExtensions: [
        'mjs',
        'js',
        'vue',
        'json'
    ],
    transform: {
        '\\.mjs$': 'babel-jest',
        '\\.js$': 'babel-jest',
        '\\.vue$': '@vue/vue2-jest',
        '\\.(css|styl|less|sass|scss|ttf|woff|woff2)(\\?|$)': 'jest-transform-stub',
        '\\.svg': '<rootDir>/src/test/jest-transform-svgs'
    },
    transformIgnorePatterns: [
        '/node_modules/'
    ],
    reporters: ['default', ['jest-junit', { outputDirectory: './coverage', reportTestSuiteErrors: true }]],
    coverageReporters: ['lcov', 'text'],
    coverageProvider: 'v8',
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
        `^<rootDir>/(${coverageIgnoreFolders.join('|')})/`,
        `<rootDir>/(${coverageIgnoreFiles.join('|')})`
    ],
    watchPathIgnorePatterns: [
        '^<rootDir>/(coverage|dist|target|node_modules|bin|webapps-common|.history)/'
    ],
    testEnvironment: 'jsdom',
    testEnvironmentOptions: {
        url: 'http://test.example/'
    },
    testMatch: [
        '<rootDir>/**/__tests__/*.test.js'
    ],
    setupFiles: ['<rootDir>/src/test/jest-setup', 'jest-useragent-mock']
};
