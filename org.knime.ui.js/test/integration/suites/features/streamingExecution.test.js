const { state, action, misc, decorator } = require('../../plugins/locators');
const executionTimer = 20;

Feature('Streaming Execution').tag('@features-@streamingExecution');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-streamingExecution');
    I.seeElement({ nodeId: 6, state: state.CONFIGURED });
});

// FIXME NXT-712
Scenario.skip('Streaming execution', async ({ I }) => {
    __`Execute Stream`;
    I.click({ action: action.EXECUTE_ALL });
    I.doubleClickNodeWithCtrl({ nodeId: 6 });

    __`Count update not null`;
    I.dontSee(null, '.textWrapper .streamingLabel');

    __`Count changes`;
    const n = await benchmark(I);
    I.assertNotEqual(n.firstBenchmark, n.secondBenchmark);

    __`Confirm execution inside component`;
    // eslint-disable-next-line no-magic-numbers
    I.waitForText('4,000,000', 120, locate('.textWrapper .streamingLabel').at(3));
    I.waitForElement({ nodeId: '6:0:7', state: state.EXECUTED }, executionTimer);

    __`Confirm execution outside component`;
    I.click({ breadcrumbChild: 1 });
    I.seeElement({ nodeId: '6', state: state.EXECUTED });
});

Scenario('Cancel exeuction outside component', async ({ I }) => {
    __`Execute and Cancel outside component`;
    I.click({ action: action.EXECUTE_ALL });
    I.wait(1);
    I.click({ action: action.CANCEL_ALL });
    I.seeElement({ nodeId: 6, misc: misc.EXECUTION_CANCELLED });

    __`Enter component and check proper "cancelled" state.`;
    I.doubleClickNodeWithCtrl({ nodeId: 6 });
    I.dontSeeElement({ nodeId: '6:0:2', misc: misc.ERROR });
    const n = await benchmark(I);
    I.assertEqual(n.firstBenchmark, n.secondBenchmark);
});

Scenario('Streaming decorators', ({ I }) => {
    __`Decorator on component`;
    I.seeElement({ nodeId: 6, decorator: decorator.STREAMABLE });

    __`Global streaming decorator`;
    I.doubleClickNodeWithCtrl({ nodeId: 6 });
    I.seeElement('.type-notification.onlyStreaming');

    __`Decorators on nodes`;
    I.seeElement({ nodeId: '6:0:1', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:2', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:3', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:6', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:7', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:8', decorator: decorator.NOT_STREAMABLE });
    I.dontSeeElement({ nodeId: '6:0:8', decorator: decorator.STREAMABLE });
});

// FIXME NXT-713
Scenario.skip('Cancel execution inside component', async ({ I }) => {
    executeAndCancelInsideComponent(I);

    __`Count does not change`;
    const n = await benchmark(I);
    I.assertEqual(n.firstBenchmark, n.secondBenchmark);

    __`Node state is Configured`;
    I.seeElement({ nodeId: '6:0:1', state: state.CONFIGURED });
    I.seeElement({ nodeId: '6:0:2', state: state.CONFIGURED });
    I.seeElement({ nodeId: '6:0:7', state: state.CONFIGURED });
    I.seeElement({ nodeId: '6:0:8', state: state.CONFIGURED });
});

// FIXME NXT-650
Scenario.skip('Cancel inside component and Execute', async ({ I }) => {
    executeAndCancelInsideComponent(I);

    __`Confirm execution inside component`;
    await I.seeElementAndEnabled({ action: action.EXECUTE_ALL }, 'disabled');
    I.click({ action: action.EXECUTE_ALL });
    I.dontSeeElement({ nodeId: '6:0:2', misc: misc.ERROR });
    I.waitForElement({ nodeId: '6:0:7', state: state.EXECUTED }, executionTimer);
    I.seeElement({ nodeId: '6:0:1', state: state.EXECUTED });
    I.seeElement({ nodeId: '6:0:8', state: state.EXECUTED });
});

const benchmark = async (I) => {
    /* eslint-disable no-magic-numbers */
    const firstBenchmark = await I.grabTextFrom(locate('.textWrapper .streamingLabel').at(3));
    I.wait(2);
    const secondBenchmark = await I.grabTextFrom(locate('.textWrapper .streamingLabel').at(3));
    /* eslint-enable no-magic-numbers */

    return { firstBenchmark, secondBenchmark };
};

const executeAndCancelInsideComponent = (I) => {
    __`Execute Stream and Cancel all inside component`;
    I.click({ action: action.EXECUTE_ALL });
    I.doubleClickNodeWithCtrl({ nodeId: 6 });
    I.click({ action: action.CANCEL_ALL });
};
