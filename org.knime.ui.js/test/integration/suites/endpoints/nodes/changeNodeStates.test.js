// changeNodeStates(projectId, workflowId, nodeIds[], action)

const { state, misc } = require('../../../plugins/locators');
const { Trigger } = require('../../../steps/Trigger');

Feature('Change Node States').tag('@endpoints-@node-@changeNodeStates');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-changeNodeStates');
    I.seeElement({ nodeId: 3 });
    I.seeElement({ nodeId: 4 });
    I.seeElement({ nodeId: 5 });
});

Scenario('Single node - Shortcut', ({ I }) => {
    __`Execute node`;
    Trigger.shortcut.executeNode('3');
    I.seeElement({ nodeId: 3, state: state.EXECUTING_CIRCLE });

    __`Cancel node`;
    Trigger.shortcut.cancelNode('3');
    I.seeElement({ nodeId: 3, misc: misc.EXECUTION_CANCELLED });

    __`Complete execution`;
    Trigger.shortcut.executeNode('3');
    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 3, state: state.EXECUTED }, 5);

    __`Reset node`;
    Trigger.shortcut.resetNode('3');
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
});

Scenario('Multiple nodes - Shortcut', ({ I }) => {
    __`Execute node`;
    Trigger.shortcut.executeMultipleNodes({ nodeId: 3 }, { nodeId: 5 });
    I.seeElement({ nodeId: 3, state: state.EXECUTING_CIRCLE });
    I.seeElement({ nodeId: 5, state: state.EXECUTING_CIRCLE });

    __`Cancel node`;
    Trigger.shortcut.cancelMultipleNodes({ nodeId: 3 }, { nodeId: 5 });
    I.seeElement({ nodeId: 3, misc: misc.EXECUTION_CANCELLED });
    I.seeElement({ nodeId: 5, misc: misc.EXECUTION_CANCELLED });

    __`Complete execution`;
    Trigger.shortcut.executeMultipleNodes({ nodeId: 3 }, { nodeId: 5 });
    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 3, state: state.EXECUTED }, 5);
    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 5, state: state.EXECUTED }, 5);

    __`Reset node`;
    Trigger.shortcut.resetMultipleNodes({ nodeId: 3 }, { nodeId: 5 });
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
    I.seeElement({ nodeId: 5, state: state.CONFIGURED });
});

Scenario('All nodes - Shortcut', ({ I }) => {
    __`Execute all`;
    Trigger.shortcut.executeAll();
    I.seeElement({ nodeId: 3, state: state.EXECUTING_CIRCLE });
    I.seeElement({ nodeId: 5, state: state.EXECUTING_CIRCLE });
    I.seeElement({ nodeId: 4, state: state.EXECUTED });
    I.seeElement({ nodeId: 210, state: state.EXECUTED });

    __`Cancel all`;
    Trigger.shortcut.cancelAll();
    I.seeElement({ nodeId: 3, misc: misc.EXECUTION_CANCELLED });
    I.seeElement({ nodeId: 5, misc: misc.EXECUTION_CANCELLED });

    __`Complete execution`;
    Trigger.shortcut.executeAll();
    /* eslint-disable no-magic-numbers */
    I.waitForElement({ nodeId: 3, state: state.EXECUTED }, 5);
    I.waitForElement({ nodeId: 5, state: state.EXECUTED }, 5);
    I.waitForElement({ nodeId: 4, state: state.EXECUTED }, 5);
    I.waitForElement({ nodeId: 210, state: state.EXECUTED }, 5);
    /* eslint-enable no-magic-numbers */

    __`Reset all`;
    Trigger.shortcut.resetAll();
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
    I.seeElement({ nodeId: 5, state: state.CONFIGURED });
    I.seeElement({ nodeId: 4, state: state.CONFIGURED });
    I.seeElement({ nodeId: 210, state: state.CONFIGURED });
});

// Simple case for workflodId parameter. Could add more in the future.

Scenario('All nodes - WorkflowId - Shortcut', ({ I }) => {
    __`Open component`;
    I.doubleClickNodeWithCtrl({ nodeId: 210 });

    __`Execute all`;
    Trigger.shortcut.executeAll();
    I.seeElement({ nodeId: '210:0:5', state: state.EXECUTING_CIRCLE });

    __`Cancel all`;
    Trigger.shortcut.cancelAll();
    I.seeElement({ nodeId: '210:0:5', misc: misc.EXECUTION_CANCELLED });

    __`Complete execution`;
    Trigger.shortcut.executeAll();
    /* eslint-disable no-magic-numbers */
    I.waitForElement({ nodeId: '210:0:1', state: state.EXECUTED }, 5);
    I.waitForElement({ nodeId: '210:0:5', state: state.EXECUTED }, 5);
    I.waitForElement({ nodeId: '210:0:9', state: state.EXECUTED }, 5);
    I.waitForElement({ nodeId: '210:0:9', state: state.EXECUTED }, 5);
    /* eslint-enable no-magic-numbers */

    __`Reset node`;
    Trigger.shortcut.resetAll();
    I.seeElement({ nodeId: '210:0:1', state: state.CONFIGURED });
    I.seeElement({ nodeId: '210:0:5', state: state.CONFIGURED });
    I.seeElement({ nodeId: '210:0:8', state: state.CONFIGURED });
    I.seeElement({ nodeId: '210:0:9', state: state.CONFIGURED });
});
