exports.config = {
    tests: './suites/**/*.test.js',
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
    mocha: { reporterOptions: {
        'mocha-junit-reporter': {
            stdout: './output/console.log',
            options: {
                mochaFile: 'test/integration/reports/result.xml',
                attachments: true // add screenshot for a failed test
            }
        },
        'codeceptjs-cli-reporter': {
            stdout: '-',
            options: {
                steps: true
            }
        }
    } },
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
        commentStep: {
            enabled: true,
            registerGlobal: true
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
        },
        contextMenuLocator: {
            enabled: true,
            require: './plugins/contextMenuLocator.js'
        },
        connectorLocator: {
            enabled: true,
            require: './plugins/connectorLocator.js'
        },
        sidebarLocator: {
            enabled: true,
            require: './plugins/sidebarLocator.js'
        }
    }
};
