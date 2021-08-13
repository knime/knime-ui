const { state, context } = require('../plugins/locators');
const kanvas = '#kanvas > svg';

Feature('Context Menu');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-contextMenu');

    I.seeElement(kanvas);
    I.seeElement({ nodeId: 1, state: state.CONFIGURED });
    I.seeElement({ nodeId: 6, state: state.CONFIGURED });
});

Scenario('Not Executing - kanvas', async ({ I }) => {
    I.rightClick(kanvas);

    I.click('//*[@role="menu"]//span[text()="Execute all"]')


});
