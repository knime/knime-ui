const { metanodeState, state } = require('../../../../plugins/locators');
const { Trigger } = require('../../../../steps/Trigger');

Feature('Metanode State').tag(
    '@schemas-@nodes-@metaNode-@metaNodeState'
);

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-getWorkflow');

    I.seeElement({ nodeId: 3, state: state.IDLE });
    I.seeElement({ nodeId: 6 });
});

Scenario('Metanode states', ({ I }) => {
    __`Idle`;
    I.seeElement({ nodeId: 6, metanodeState: metanodeState.IDLE });

    __`Executing`;
    Trigger.toolbar.executeAll();

    I.seeElement({ nodeId: 6, metanodeState: metanodeState.EXECUTING });

    __`Executed`;
    // eslint-disable-next-line no-magic-numbers
    I.waitForElement({ nodeId: 6, metanodeState: metanodeState.EXECUTING }, 5);
});
