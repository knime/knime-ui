const port = 4444;

module.exports = {
    src_folders: ['test/integration/suites'],
    output_folder: 'test/integration/reports',
    custom_assertions_path: ['test/integration/custom-assertions'],
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
