const { hover, state } = require('../plugins/locators');
const currentIteration = locate('td').withText('currentIteration');
const valueFromCurrentIteration = locate('td').after(currentIteration);

Feature('Loop execution');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-loopExecution');

    I.seeElement({ nodeId: 1, state: state.CONFIGURED });
    I.seeElement({ nodeId: 6, state: state.CONFIGURED });
    I.seeElement({ nodeId: 7, state: state.CONFIGURED });
    I.seeElement({ nodeId: 10, state: state.CONFIGURED });
});

Scenario('Hover Loop End and check Action Bar', async ({ I }) => {
    I.hover({ nodeId: 10 });
    await I.seeElementAndEnabled({ hover: hover.OPEN_DIALOG }, 'class');
    await I.seeElementAndEnabled({ hover: hover.EXECUTE }, 'class');
    await I.seeElementAndEnabled({ hover: hover.STEP }, 'class');
    await I.seeElementAndDisabled({ hover: hover.CANCEL }, 'class');
    await I.seeElementAndDisabled({ hover: hover.RESET }, 'class');
});

Scenario('Step Loop Execution on loop end', async ({ I }) => {
    __`Execute Step loop and check action bar`;
    I.hover({ nodeId: 10 });
    I.click({ hover: hover.STEP });

    // TODO: Check PAUSED node status
    I.seeElementAndEnabled({ hover: hover.OPEN_DIALOG });
    I.seeElementAndEnabled({ hover: hover.RESUME });
    I.seeElementAndEnabled({ hover: hover.STEP });
    I.seeElementAndEnabled({ hover: hover.CANCEL });
    I.seeElementAndDisabled({ hover: hover.RESET });

    __`First loop`;
    I.click({ nodeId: 6 });
    I.click('Flow Variables');
    const firstIteration = await I.grabTextFrom(valueFromCurrentIteration);
    I.assert(firstIteration, 0);

    __`Second loop`;
    I.click({ nodeId: 10 });
    I.hover({ nodeId: 10 });
    I.click({ hover: hover.STEP });
    I.click({ nodeId: 6 });
    I.click('Flow Variables');
    const secondIteration = await I.grabTextFrom(valueFromCurrentIteration);
    I.assert(secondIteration, 1);
});
