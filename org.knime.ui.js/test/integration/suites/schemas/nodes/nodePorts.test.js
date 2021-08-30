const { state } = require('../../../plugins/locators');

Feature('Node ports').tag('@schemas-@nodes-@nodePorts');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-doPortRpc');

    I.seeElement({ nodeId: 7, state: state.IDLE });
    I.seeElement({ nodeId: 209, state: state.CONFIGURED });
});

Scenario('Name / Type', ({ I }) => {
    __`Open component`;
    I.doubleClickNodeWithCtrl({ nodeId: 7 });

    __`Name`;
    I.see('Fau', '.port-name');
    I.see('Pancho', '.port-name');
    I.see('Martin', '.port-name');

    __`Type`;
    I.see('Type: Flow Variable', '.port-type');
    I.see('Type: Generic Port', '.port-type');
    I.see('Type: Normalizer', '.port-type');
    I.see('Type: Data', '.port-type');
});

Scenario('Optional @focus', ({ I }) => {
    __`Optional`;
    I.seeAttributesOnElements('[data-node-id="root:209"] > g > g > g:nth-child(3) > polygon', { fill: 'transparent' });
});
