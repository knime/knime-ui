const { state } = require('../../../plugins/locators');

Feature('Component Node Template').tag(
    '@schemas-@workflow-@componentNodeTemplate'
);

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-getWorkflow');

    I.seeElement({ nodeId: 3, state: state.IDLE });
    I.seeElement({ nodeId: 6 });
});

Scenario('Properties of schema:', ({ I }) => {
    __`Title:`;
    __`Description:`;
    __`Type:`;
    // Right now, it seems there's only Learner and Visualizer enabled.
});
