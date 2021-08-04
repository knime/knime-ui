exports.config = {
    tests: './suites/*',
    output: './output',
    helpers: {
        Puppeteer: {
            url: 'http://localhost:8888',
            chrome: {
                defaultViewport: null,
                browserWSEndpoint: ''
            }
        },
        KnimeNode: {
            require: './helpers/KnimeNode.js'
        },
        AssertWrapper: {
            require: 'codeceptjs-assert'
        },
        Workflow: {
            require: './helpers/Workflow.js'
        }
    },
    include: {
        I: './steps_file.js'
    },
    bootstrap: null,
    mocha: {},
    name: 'org.knime.ui.js',
    plugins: {
        pauseOnFail: {},
        retryFailedStep: {
            enabled: true
        },
        tryTo: {
            enabled: true
        },
        screenshotOnFail: {
            enabled: true
        },
        // Custom plugins:
        nodeLocator: {
            enabled: true,
            require: './plugins/nodeLocator.js'
        },
        breadcrumbLocator: {
            enabled: true,
            require: './plugins/breadcrumbLocator.js'
        },
        toolbarLocator: {
            enabled: true,
            require: './plugins/toolbarLocator.js'
        },
        hoverActionLocator: {
            enabled: true,
            require: './plugins/hoverActionsLocator.js'
        }
    }
};
