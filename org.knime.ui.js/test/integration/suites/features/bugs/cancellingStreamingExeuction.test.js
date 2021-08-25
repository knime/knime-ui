const { state, action, misc } = require('../../../plugins/locators');

const executionTimer = 20;

Feature('cancellingStreamingExecution').tag('@features-@cancellingStreamingExecution');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-streamingExecution');
    I.seeElement({ nodeId: 6, state: state.CONFIGURED });
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

Scenario('Cancel execution inside component', async ({ I }) => {
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

Scenario('Cancel inside component and Execute', async ({ I }) => {
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
