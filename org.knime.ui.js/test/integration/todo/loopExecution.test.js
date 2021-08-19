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
    stepOnLoopEnd(I);

    I.seeElement({ nodeId: 10, state: state.PAUSED });

    await I.seeElementAndEnabled({ hover: hover.OPEN_DIALOG });
    await I.seeElementAndEnabled({ hover: hover.RESUME });
    await I.seeElementAndEnabled({ hover: hover.STEP });
    await I.seeElementAndEnabled({ hover: hover.CANCEL });
    await I.seeElementAndDisabled({ hover: hover.RESET });

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

Scenario('Resume Step Loop execution', async ({ I }) => {
    stepOnLoopEnd(I);
    I.click({ hover: hover.RESUME });

    await I.seeElementAndEnabled({ hover: hover.PAUSE });
    await I.seeElementAndEnabled({ hover: hover.CANCEL });
});

Scenario('Pause Step Loop execution', ({ I }) => {
    executeOnLoopEnd(I);
    
    I.click({ hover: hover.PAUSE });

    I.seeElement({ nodeId: 10, state: state.PAUSED });
});

// NXT-644 (Error when paused loop execution is continued)
Scenario('Complete Loop execution', ({ I }) => {
    executeOnLoopEnd(I);
    
    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 10, state: state.EXECUTED }, 30);
});

// NXT-644 (Error when paused loop execution is continued)
Scenario('Action Bar while selecting another node', ({ I }) => {
    stepOnLoopEnd(I);

    __`Select another node`;
    I.click({ nodeId: 7 });

    __`Hover and resume the loop execution while the other node is selected`;
    I.hover({ nodeId: 10 });
    I.click({ hover: hover.RESUME });

    __`Check node is running`;
    I.dontSeeElement('.error-overlay');
    I.seeElement({ nodeId: 10, state: state.RUNNING });
});

// Utilities:

const stepOnLoopEnd = (I) => {
    __`Step Loop Execution in Loop End`;
    I.hover({ nodeId: 10 });
    I.click({ hover: hover.STEP });
};

const executeOnLoopEnd = (I) => {
    __`Execute Loop Execution in Loop End`;
    I.hover({ nodeId: 10 });
    I.click({ hover: hover.EXECUTE });
};
