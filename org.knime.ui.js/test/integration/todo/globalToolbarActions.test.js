const { state, action, misc } = require('../plugins/locators');

Feature('Global toolbar actions');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-globalToolbarAndStatusChange');

    // Making sure the test is "cleaned" and properly resetted.
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
    I.seeElement({ nodeId: 2, state: state.IDLE });
});

Scenario('Cancel workflow and Execute again', ({ I }) => {
    // New syntax to make long tests legible.
    __`Execute all`;
    I.click({ action: action.EXECUTE_ALL });
    I.seeElement({ nodeId: 3, state: state.EXECUTING_CIRCLE });

    __`Cancel all`;
    I.click({ action: action.CANCEL_ALL });
    I.seeElement({ nodeId: 3, misc: misc.EXECUTION_CANCELLED });
    I.seeElement({ nodeId: 2, state: state.IDLE });

    __`Execute all`;
    executeAll(I);
});

Scenario('Reset All', ({ I }) => {
    __`Execute all`;
    executeAll(I);

    __`Reset all`;
    I.click({ action: action.RESET_ALL });
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
    I.seeElement({ nodeId: 2, state: state.IDLE });
});

// Utilities:

const executeAll = (I) => {
    I.click({ action: action.EXECUTE_ALL });
    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 3, state: state.EXECUTED }, 16);
    I.seeElement({ nodeId: 2, state: state.EXECUTED });
};
