const { state, decorator, action } = require('../plugins/locators');

Feature('Streaming execution test');

Scenario('Load workflow', ({ I }) => {
    I.loadWorkflow('test-streamingExecution');
    I.dontSeeElement('.action-executeNodes');
    I.seeElement({ nodeId: 6, state: state.CONFIGURED });
});

Scenario('Check for streaming decorator', ({ I }) => {
    I.seeElement({ nodeId: 6, decorator: decorator.STREAMABLE });
});

Scenario('Open component', ({ I }) => {
    I.doubleClickNodeWithCtrl({ nodeId: 6 });
});

Scenario('Check for global decorator', ({ I }) => {
    I.seeElement('.type-notification.onlyStreaming');
});

Scenario('Check for supported and not supported decorators on nodes', ({ I }) => {
    I.seeElement({ nodeId: '6:0:1', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:2', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:3', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:6', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:7', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:8', decorator: decorator.NOT_STREAMABLE });
    I.dontSeeElement({ nodeId: '6:0:8', decorator: decorator.STREAMABLE });
});

Scenario('Navigate to workflow via breadcrumb', ({ I }) => {
    I.click({ breadcrumbChild: 1 });
});

Scenario('Execute workflow', ({ I }) => {
    I.click({ action: action.EXECUTE_ALL });
});

Scenario('Reopen component', ({ I }) => {
    I.doubleClickNodeWithCtrl({ nodeId: 6 });
});

Scenario('Check for streaming connector count update', async ({ I }) => {
    I.seeElement('.textWrapper .streamingLabel');
    I.dontSee(null, '.textWrapper .streamingLabel');
    /* eslint-disable no-magic-numbers */
    const firstBenchmark = await I.grabTextFrom(locate('.textWrapper .streamingLabel').at(3));
    I.wait(0.2);
    const secondBenchmark = await I.grabTextFrom(locate('.textWrapper .streamingLabel').at(3));
    /* eslint-enable no-magic-numbers */
    I.assertNotEqual(firstBenchmark, secondBenchmark);
});

Scenario('Wait for execution to finish', ({ I }) => {
    /* eslint-disable no-magic-numbers */
    I.waitForText('4,000,000', 50, locate('.textWrapper .streamingLabel').at(3));
    I.waitForElement({ nodeId: '6:0:7', state: state.EXECUTED }, 50);
    /* eslint-enable no-magic-numbers */
});

Scenario('Navigate back to workflow', ({ I }) => {
    I.click({ breadcrumbChild: 1 });
});

Scenario('Check for executed state', ({ I }) => {
    I.seeElement({ nodeId: '6', state: state.EXECUTED });
});
