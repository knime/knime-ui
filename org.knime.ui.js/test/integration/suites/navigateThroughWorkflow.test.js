const { state } = require('../plugins/locators');

Feature('Navigate through workflow');

Scenario('Load workflow', ({ I }) => {
    I.loadWorkflow('test-navigateThroughWorkflow');
    I.dontSeeElement('.action-executeNodes');
    I.seeElement({ nodeId: 3 });
    I.seeElement({ nodeId: 3, state: state.CONFIGURED });
});

Scenario('Check for panel meta info', ({ I }) => {
    I.see('Navigate-through-workflow', '#metadata');
    I.see('* navigation into components and metanodes and back and', '#metadata .metadata');
});

Scenario('Open component', ({ I }) => {
    I.doubleClickNodeWithCtrl({ nodeId: 3 });
    I.see('Output ports', '#metadata .outports');
    I.see('TestData', '#metadata .outports');
});

Scenario('Open metanode', ({ I }) => {
    I.doubleClickNode({ nodeId: '3:0:6' });
    I.seeElement({ nodeId: '3:0:6:2' });
    I.dontSeeElement('#metadata');
});

Scenario('Navigate via breadcrumb back to component', ({ I }) => {
    I.click({ breadcrumbChild: 2 });
    I.seeElement('#metadata');
    I.see('Output ports', '#metadata .outports');
    I.seeElement({ nodeId: '3:0:6' });
});

Scenario('Navigate via breadcrumb back to root', ({ I }) => {
    I.click({ breadcrumbChild: 1 });
    I.seeElement('#metadata');
    I.see('Navigate-through-workflow', '#metadata');
    I.seeElement({ nodeId: 3 });
});
