const { state } = require('../../../plugins/locators');

Feature('getWorkflow').tag('@endpoints-@workflow-@getWorkflow');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-getWorkflow');

    I.seeElement({ nodeId: 3, state: state.IDLE });
    I.seeElement({ nodeId: 6 });
});

Scenario('Open a component', ({ I }) => {
    I.doubleClickNodeWithCtrl({ nodeId: 3 });
    I.see('Output ports', '#metadata .outports');
    I.see('TestData', '#metadata .outports');
});

Scenario('Open a metanode', ({ I }) => {
    I.doubleClickNode({ nodeId: 6 });
    I.seeElement({ nodeId: '6:2' });
    I.dontSeeElement('#metadata');
});

Scenario('Navigate back via breadcrumb. 1 Deep', ({ I }) => {
    __`Open Component`;
    I.doubleClickNodeWithCtrl({ nodeId: 6 });
    __`Back to Home`;
    I.click({ breadcrumbChild: 1 });

    I.seeElement('#metadata');
    I.seeElement({ nodeId: 3 });
});

Scenario('Navigate back via breadcrumb. 2 Deep', ({ I }) => {
    __`Open Component and Metanode`;
    openComponentAndMetanode(I);

    I.seeElement({ nodeId: '3:0:6:2' });

    __`Back to Home`;
    backToHome(I);
});

Scenario('Navigate back via breadcrumb. 2 to 1 to Home', ({ I }) => {
    __`Open Component and Metanode`;
    openComponentAndMetanode(I);

    __`Back to Component`;
    I.click({ breadcrumbChild: 2 });
    I.seeElement({ nodeId: '3:0:6' });
    I.see('Output ports', '#metadata .outports');

    __`Back to Home`;
    backToHome(I);
    
    I.seeElement('#metadata');
    I.seeElement({ nodeId: 3 });
});

Scenario('Navigate back via breadcrumb. 2 to Home to 1', ({ I }) => {
    __`Open Component and Metanode`;
    openComponentAndMetanode(I);
    __`Back to Home`;
    backToHome(I);
    __`Open Component`;
    I.doubleClickNodeWithCtrl({ nodeId: 3 });
    I.seeElement({ nodeId: '3:0:6' });
    I.see('Output ports', '#metadata .outports');
});

const backToHome = (I) => {
    I.click({ breadcrumbChild: 1 });
    I.seeElement('#metadata');
    I.seeElement({ nodeId: 3 });
};

const openComponentAndMetanode = (I) => {
    I.doubleClickNodeWithCtrl({ nodeId: 3 });
    I.doubleClickNode({ nodeId: '3:0:6' });
};
