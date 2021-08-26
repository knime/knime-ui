Feature('doPortRpc').tag('@endpoints-@node-@doPortRpc');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-changeNodeStates');
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
    I.seeElement({ nodeId: 4, state: state.CONFIGURED });
    I.seeElement({ nodeId: 5, state: state.CONFIGURED });
    I.seeElement({ nodeId: 210, state: state.CONFIGURED });
});

Scenario('Single node - portExecution', ({ I }) => {
    __`Execute node`;
});
