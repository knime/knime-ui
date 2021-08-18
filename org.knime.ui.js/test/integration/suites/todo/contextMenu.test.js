const { state, context } = require('../plugins/locators');
const kanvas = '#kanvas > svg';

Feature('Context Menu');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-contextMenu');

    I.seeElement(kanvas);
    I.seeElement({ nodeId: 1, state: state.IDLE });
    I.seeElement({ nodeId: 6, state: state.IDLE });
    I.seeElement({ nodeId: 7, state: state.IDLE });
    I.seeElement({ nodeId: 11, state: state.IDLE });
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
    I.seeElement({ nodeId: 10, state: state.IDLE });
});

Scenario('Not Executing - kanvas', async ({ I }) => {
    I.rightClick(kanvas);

    await I.seeElementAndEnabled({ context: context.EXECUTE_ALL }, 'class');
    await I.seeElementAndDisabled({ context: context.CANCEL_ALL }, 'class');
    await I.seeElementAndDisabled({ context: context.RESET_ALL }, 'class');
});

Scenario('Executing - kanvas', async ({ I }) => {
    I.rightClick(kanvas);
    I.click({ context: context.EXECUTE_ALL });

    I.rightClick(kanvas);

    await I.seeElementAndDisabled({ context: context.EXECUTE_ALL }, 'class');
    await I.seeElementAndEnabled({ context: context.CANCEL_ALL }, 'class');
});

Scenario('Executed - kanvas', async ({ I }) => {
    __`Execute workflow`;
    I.rightClick(kanvas);
    I.click({ context: context.EXECUTE_ALL });

    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 11, state: state.EXECUTED }, 20);

    I.rightClick(kanvas);

    await I.seeElementAndDisabled({ context: context.EXECUTE_ALL }, 'class');
    await I.seeElementAndDisabled({ context: context.CANCEL_ALL }, 'class');
    await I.seeElementAndEnabled({ context: context.RESET_ALL }, 'class');

    __`Reset workflow`;
    I.click({ context: context.RESET_ALL });

    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
    I.seeElement({ nodeId: 10, state: state.IDLE });
});

Scenario('Delete and Loop end node', async ({ I }) => {
    __`Delete Wait timer`;
    I.rightClick({ nodeId: 3 });
    I.click({ context: context.DELETE });

    I.dontSeeElement({ nodeId: 3 });
    I.seeElement({ nodeId: 10, state: state.CONFIGURED });

    __`Delete Wait timer`;
    I.rightClick({ nodeId: 10 });

    await I.seeElementAndEnabled({ context: context.EXECUTE }, 'class');
    await I.seeElementAndEnabled({ context: context.STEP }, 'class');
    await I.seeElementAndDisabled({ context: context.CANCEL }, 'class');
    await I.seeElementAndDisabled({ context: context.RESET }, 'class');
    await I.seeElementAndEnabled({ context: context.CONFIGURE }, 'class');
    await I.seeElementAndEnabled({ context: context.DELETE }, 'class');
    I.dontSeeElement({ context: context.OPEN_VIEW });
});

Scenario('Execute and Cancel - node: table view', ({ I }) => {
    __`Execute Node Table`;
    I.rightClick({ nodeId: 11 });
    I.click({ context: context.EXECUTE });

    I.seeElement({ nodeId: 3, state: state.EXECUTING_CIRCLE });
    I.seeElement({ nodeId: 10, state: state.RUNNING });

    __`Cancel Node Table`;
    I.rightClick({ nodeId: 11 });
    I.click({ context: context.CANCEL });
    I.seeElement({ nodeId: 11, state: state.IDLE });
});
