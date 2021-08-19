const { state, hover } = require('../plugins/locators');

const kanvas = '#kanvas > svg';

Feature('Kanvas node hover');

Scenario('Load workflow', ({ I }) => {
    I.loadWorkflow('test-kanvasNodeInteraction');
    I.seeElement(kanvas);
});

Scenario('Hover first node and verify that the node action bar is present', ({ I }) => {
    I.dontSeeElement({ hover: hover.EXECUTE });
    I.seeElement({ nodeId: 207, state: state.CONFIGURED });
});

Scenario('Select workflow first node', ({ I }) => {
    I.hover({ nodeId: 207 });
    I.seeElement({ hover: hover.EXECUTE });
    I.hover(kanvas);
    I.dontSeeElement({ hover: hover.EXECUTE });
});
