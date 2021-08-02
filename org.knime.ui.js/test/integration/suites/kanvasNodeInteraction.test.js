const { state, hover } = require('../plugins/locators');

const kanvas = '#kanvas > svg';
const outputContainer = '.output-container';
const outputTable = `${outputContainer} table`;
const executeOutputButton = 'button.action-button.button.primary.compact';

Feature('Kanvas node interaction');

Scenario('Load workflow', ({ I }) => {
    I.loadWorkflow('test-kanvasNodeInteraction');
    I.seeElement(kanvas);
});

Scenario('Verify workflow first node is present', ({ I }) => {
    I.dontSeeElement({ hover: hover.EXECUTE });
    I.seeElement({ nodeId: 207, state: state.CONFIGURED });
});

Scenario('Select workflow first node', ({ I }) => {
    I.click({ nodeId: 207 });
    I.seeElement({ hover: hover.EXECUTE });
});

Scenario('Run clicked node via action bar button', ({ I }) => {
    I.click({ hover: hover.EXECUTE });
    I.seeElement({ nodeId: 207, state: state.EXECUTING });
    I.seeElement(outputTable);
    I.seeElement({ nodeId: 207, state: state.EXECUTED });
    I.see('Universe_0_1', outputTable);
});

Scenario('Reset clicked node via action bar button', ({ I }) => {
    I.seeElement({ hover: hover.RESET });
    I.click({ hover: hover.RESET });
    I.see('To show the output table, please execute the selected node', outputContainer);
    I.seeElement({ nodeId: 207, state: state.CONFIGURED });
    I.dontSeeElement({ nodeId: 207, state: state.EXECUTED });
});

Scenario('Run node using output view execute button', ({ I }) => {
    I.seeElement(executeOutputButton);
    I.click(executeOutputButton);
    I.seeElement({ nodeId: 207, state: state.EXECUTING });
    I.seeElement(outputTable);
    I.seeElement({ nodeId: 207, state: state.EXECUTED });
    I.see('Universe_0_1', outputTable);
});

Scenario('Unselect node', ({ I }) => {
    I.click(kanvas);
    I.dontSeeElement({ hover: hover.EXECUTE });
});
