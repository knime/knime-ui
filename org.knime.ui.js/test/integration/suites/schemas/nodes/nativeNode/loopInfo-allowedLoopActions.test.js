const { hover, state, context } = require('../../../../plugins/locators');
const { Trigger } = require('../../../../steps/Trigger');

Feature('Loop info / Allowed loop actions').tag(
    '@schemas-@nodes-@nativeNode-@loopInfo'
);

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-changeLoopState');

    I.seeElement({ nodeId: 1, state: state.CONFIGURED });
    I.seeElement({ nodeId: 6, state: state.CONFIGURED });
    I.seeElement({ nodeId: 7, state: state.CONFIGURED });
    I.seeElement({ nodeId: 10, state: state.CONFIGURED });
    I.seeElement({ nodeId: 211, state: state.CONFIGURED });
});

Scenario('Allowed loop actions - actionBar', async ({ I }) => {
    __`Initial state:`;
    I.hover({ nodeId: 10 });
    I.dontSeeElement({ hover: hover.RESUME });
    I.dontSeeElement({ hover: hover.PAUSE });
    await I.seeElementAndEnabled({ hover: hover.STEP });

    __`Step/paused state:`;
    Trigger.actionBar.stepNode('10');
    await I.seeElementAndEnabled({ hover: hover.RESUME });
    I.dontSeeElement({ hover: hover.PAUSE });
    await I.seeElementAndEnabled({ hover: hover.STEP });

    __`Execution state:`;
    Trigger.actionBar.resumeNode('10');
    I.dontSeeElement({ hover: hover.RESUME });
    await I.seeElementAndEnabled({ hover: hover.PAUSE });
    await I.seeElementAndDisabled({ hover: hover.STEP });
});

Scenario('Allowed loop actions - contextMenu', async ({ I }) => {
    __`Initial state:`;
    I.rightClick({ nodeId: 10 });

    I.dontSeeElement({ context: context.RESUME });
    I.dontSeeElement({ context: context.PAUSE });
    await I.seeElementAndEnabled({ context: context.STEP });

    __`Step/paused state:`;
    Trigger.contextMenu.stepNode('10');
    I.rightClick({ nodeId: 10 });

    await I.seeElementAndEnabled({ context: context.RESUME });
    I.dontSeeElement({ context: context.PAUSE });
    await I.seeElementAndEnabled({ context: context.STEP });

    __`Execution state:`;
    Trigger.contextMenu.resumeNode('10');
    I.rightClick({ nodeId: 10 });

    I.dontSeeElement({ context: context.RESUME });
    await I.seeElementAndEnabled({ context: context.PAUSE });
    await I.seeElementAndDisabled({ context: context.STEP });
});
