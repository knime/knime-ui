const { hover, state, action } = require('../../../plugins/locators');
const { Trigger } = require('../../../steps/Trigger');

Feature('allowedNodeActions').tag('@schemas-@nodes-@allowedNodeActions');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-allowedNodeActions');

    I.seeElement({ nodeId: 1 });
    I.seeElement({ nodeId: 2, state: state.CONFIGURED });
    I.seeElement({ nodeId: 3, state: state.IDLE });
    I.seeElement({ nodeId: 4, state: state.CONFIGURED });
});

Scenario('canExecute', async ({ I }) => {
    I.hover({ nodeId: 1 });
    await I.seeElementAndEnabled({ hover: hover.EXECUTE }, 'class');
    I.hover({ nodeId: 2 });
    await I.seeElementAndEnabled({ hover: hover.EXECUTE }, 'class');
    I.hover({ nodeId: 3 });
    await I.seeElementAndDisabled({ hover: hover.EXECUTE }, 'class');
    I.hover({ nodeId: 4 });
    await I.seeElementAndEnabled({ hover: hover.EXECUTE }, 'class');
});

Scenario('canCancel', async ({ I }) => {
    __`Initial state`;
    I.hover({ nodeId: 4 });
    await I.seeElementAndDisabled({ hover: hover.CANCEL }, 'class');
    I.hover({ nodeId: 1 });
    await I.seeElementAndDisabled({ hover: hover.CANCEL }, 'class');
    I.hover({ nodeId: 2 });
    await I.seeElementAndDisabled({ hover: hover.CANCEL }, 'class');
    I.hover({ nodeId: 3 });
    await I.seeElementAndDisabled({ hover: hover.CANCEL }, 'class');

    __`Execution state`;
    Trigger.toolbar.executeAll();

    I.hover({ nodeId: 4 });
    await I.seeElementAndEnabled({ hover: hover.CANCEL }, 'class');
    I.hover({ nodeId: 1 });
    await I.seeElementAndDisabled({ hover: hover.CANCEL }, 'class');
    I.hover({ nodeId: 2 });
    await I.seeElementAndDisabled({ hover: hover.CANCEL }, 'class');
    I.hover({ nodeId: 3 });
    await I.seeElementAndDisabled({ hover: hover.CANCEL }, 'class');
});

Scenario('canReset', async ({ I }) => {
    __`Initial state`;
    I.hover({ nodeId: 4 });
    await I.seeElementAndDisabled({ hover: hover.RESET }, 'class');
    I.hover({ nodeId: 1 });
    await I.seeElementAndDisabled({ hover: hover.RESET }, 'class');
    I.hover({ nodeId: 2 });
    await I.seeElementAndDisabled({ hover: hover.RESET }, 'class');
    I.hover({ nodeId: 3 });
    await I.seeElementAndDisabled({ hover: hover.RESET }, 'class');

    __`Execution state`;
    Trigger.toolbar.executeAll();
    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 4, state: state.EXECUTED }, 5);

    I.hover({ nodeId: 4 });
    await I.seeElementAndEnabled({ hover: hover.RESET }, 'class');
    I.hover({ nodeId: 1 });
    await I.seeElementAndEnabled({ hover: hover.RESET }, 'class');
    I.hover({ nodeId: 2 });
    await I.seeElementAndEnabled({ hover: hover.RESET }, 'class');
    I.hover({ nodeId: 3 });
    await I.seeElementAndDisabled({ hover: hover.RESET }, 'class');
});

Scenario('canOpenDialog', async ({ I }) => {
    I.hover({ nodeId: 1 });
    await I.seeElementAndEnabled({ hover: hover.OPEN_DIALOG }, 'class');
    I.hover({ nodeId: 2 });
    await I.seeElementAndEnabled({ hover: hover.OPEN_DIALOG }, 'class');
    I.hover({ nodeId: 3 });
    await I.seeElementAndEnabled({ hover: hover.OPEN_DIALOG }, 'class');
    I.hover({ nodeId: 4 });
    await I.seeElementAndEnabled({ hover: hover.OPEN_DIALOG }, 'class');
});

Scenario('canDelete', async ({ I }) => {
    I.click({ nodeId: 1 });
    await I.seeElementAndEnabled({ action: action.DELETE }, 'class');
    I.click({ nodeId: 2 });
    await I.seeElementAndEnabled({ action: action.DELETE }, 'class');
    I.click({ nodeId: 3 });
    await I.seeElementAndEnabled({ action: action.DELETE }, 'class');
    I.click({ nodeId: 4 });
    await I.seeElementAndEnabled({ action: action.DELETE }, 'class');
});

