const { state, action, misc } = require('../plugins/locators');

Feature('Global toolbar and status change');

Scenario('Load workflow', ({ I }) => {
    I.loadWorkflow('test-globalToolbarAndStatusChange');
    I.dontSeeElement('.action-executeNodes');
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
});

Scenario('Execute workflow via toolbar button', ({ I }) => {
    I.click({ action: action.EXECUTE_ALL });
    I.seeElement({ nodeId: 3, state: state.EXECUTING_CIRCLE });
});

Scenario('Cancel workflow', ({ I }) => {
    I.click({ action: action.CANCEL_ALL });
    I.seeElement({ nodeId: 3, misc: misc.EXECUTION_CANCELLED });
    I.seeElement({ nodeId: 2, state: state.IDLE });
});

Scenario('Execute workflow again', ({ I }) => {
    I.click({ action: action.EXECUTE_ALL });
    I.seeElement({ nodeId: 3, state: state.EXECUTING_CIRCLE });
    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 3, state: state.EXECUTED }, 16);
    I.seeElement({ nodeId: 2, state: state.EXECUTED });
});
