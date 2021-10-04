const { state } = require('../../../plugins/locators');
const { Trigger } = require('../../../steps/Trigger');

Feature('Do Port Rpc').tag('@endpoints-@node-@doPortRpc');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-doPortRpc');
    I.seeElement({ nodeId: 210, state: state.CONFIGURED });
});

Scenario('Single node - portExecution', ({ I }) => {
    __`Execute node`;
    Trigger.toolbar.executeNode('210');

    __`First Table`;
    I.click({ nodeId: 210 });

    I.see('1: Random data with cluster ID');
    I.see('Universe_0_0', '.output-container table');
    I.see('Universe_1_1', '.output-container table');
    I.see('Rows: 100 of 500000', '.counts');
    I.see('Columns: 5', '.counts');

    __`Second Table`;
    I.click('2: Cluster centers');
    I.see('Universe_0_0', '.output-container table');
    I.see('Universe_1_1', '.output-container table');
    I.see('Rows: 4', '.counts');
    I.see('Columns: 4', '.counts');
});

// FIXME NXT-715
Scenario.skip('WorkflowId - Single node - portExecution', ({ I }) => {
    __`Open component`;
    I.doubleClickNodeWithCtrl({ nodeId: 212 });

    __`Execute node`;
    Trigger.toolbar.executeAll();

    __`First Table`;
    I.click({ nodeId: '212:0:211' });

    I.see('1: Random data with cluster ID');
    I.see('Universe_0_0', '.output-container table');
    I.see('Universe_1_1', '.output-container table');
    I.see('Rows: 100 of 500000', '.counts');
    I.see('Columns: 5', '.counts');

    __`Second Table`;
    I.click('2: Cluster centers');
    I.see('Universe_0_0', '.output-container table');
    I.see('Universe_1_1', '.output-container table');
    I.see('Rows: 4', '.counts');
    I.see('Columns: 4', '.counts');
});
