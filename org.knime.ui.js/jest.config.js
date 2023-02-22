const coverageIgnoreFolders = [
    'test-results',
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
        // place the svg stub first so that it gets resolved before other `@` prefixed svg imports
        '\\.svg$': '<rootDir>/src/test/svgStub.vue',
        '^@/(.*)$': '<rootDir>/src/$1',
        '@api': '<rootDir>/src/api/index.js',
        '@fontsource/(.*)$': 'jest-transform-stub'
    },
    moduleFileExtensions: [
        'mjs',
        'js',
        'ts',
        'vue',
        'json'
    ],
    transform: {
        '\\.mjs$': 'babel-jest',
        '\\.js$': 'babel-jest',
        '\\.ts$': 'ts-jest',
        '\\.vue$': '@vue/vue3-jest',
        '\\.(css|styl|less|sass|scss|ttf|woff|woff2)(\\?|$)': 'jest-transform-stub'
    },
    transformIgnorePatterns: [
        // ignore node_module packages for transform except packages from the @knime scope
        '/node_modules/(?!@knime/*)(.*)'
    ],
    reporters: ['default', ['jest-junit', { outputDirectory: './test-results', reportTestSuiteErrors: true }]],
    coverageDirectory: './test-results',
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
        '^<rootDir>/(test-results|dist|target|node_modules|bin|webapps-common|.history)/'
    ],
    testEnvironment: 'jsdom',
    testEnvironmentOptions: {
        url: 'http://test.example/',
        // Needed to solve this issue:
        // https://github.com/vuejs/vue-jest/issues/479#issuecomment-1163421581
        customExportConditions: ['node', 'node-addons']
    },
    modulePathIgnorePatterns: ['<rootDir>/webapps-common/*'],
    testMatch: [
        '<rootDir>/**/__tests__/*.test.js'
    ],
    setupFiles: ['<rootDir>/src/test/jest-setup', 'jest-useragent-mock']
};
