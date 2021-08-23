const { state } = require('../../../plugins/locators');

Feature('getWorkflow').tag('@endpoints-@workflow-@getWorkflow');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-getWorkflow');

    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
    I.seeElement({ nodeId: 6 });
});

Scenario('Properties of schema:', ({ I }) => {
    __`Title:`;
    I.see('Navigate-through-workflow', '#metadata');

    __`Description`;

    I.see(
        '* navigation into components and metanodes and back and',
        '#metadata .metadata'
    );

    __`Tags`;
    I.see('Lorem', '.tags');
    I.see('Ipsum', '.tags');
    I.see('Dolor', '.tags');

    __`Links`;

    within('.external-resources', () => {
        I.see('KNIME Website', 'a');
        I.see('KNIME Hub', 'a');
    });

    // "lastEdit" could be done when save option is enabled.
});
