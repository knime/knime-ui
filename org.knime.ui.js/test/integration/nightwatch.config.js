const port = 4444;

module.exports = {
    src_folders: ['test/integration/suites'],
    // filter: '*.js',
    // TODO: remove exclusions once NXT-512 is done (loading of output table)
    exclude: ['kanvasNodeInteraction.js', 'streamingExecution.js', 'kanvasNodeOutput.js'],
    output_folder: 'test/integration/reports',
    custom_assertions_path: ['test/integration/custom-assertions'],
    custom_commands_path: ['test/integration/custom-commands'],
    webdriver: {
        start_process: true,
        server_path: require('chromedriver').path,
        host: 'localhost',
        port
    },
    test_settings: {
        default: {
            start_session: true
        },
        'ap-cef': {
            desiredCapabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {
                    debuggerAddress: '0.0.0.0:8888'
                }
            }
        }
    }
};
