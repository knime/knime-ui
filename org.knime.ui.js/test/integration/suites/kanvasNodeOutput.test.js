const { state, hover } = require('../plugins/locators');

const kanvas = '#kanvas > svg';
const outputContainer = '.output-container';
const outputTable = `${outputContainer} table`;

Feature('Kanvas Node Output');

Scenario('Load workflow', ({ I }) => {
    I.loadWorkflow('test-kanvasNodeInteraction');
    I.seeElement(kanvas);
});

Scenario('Verify workflow state and first node is present', ({ I }) => {
    I.see('To show the node output, please select a configured or executed node', outputContainer);
    I.dontSeeElement({ hover: hover.EXECUTE });
    I.seeElement({ nodeId: 207, state: state.CONFIGURED });
});

Scenario('Run Node and check output', ({ I }) => {
    I.click({ nodeId: 207 });
    I.seeElement({ hover: hover.EXECUTE });
    I.click({ hover: hover.EXECUTE });
    I.seeElement(outputTable);
});

Scenario('Switch output tabs', ({ I }) => {
    const outputTabs = '.carousel';
    const firstTableRow = '.output-container table td';
    I.see('Row0', firstTableRow);
    I.click('2: Cluster centers', outputTabs);
    I.see('Cluster_0', firstTableRow);
    I.click('1: Random data with cluster ID', outputTabs);
    I.see('Row0', firstTableRow);
    I.click('Flow Variables', outputTabs);
    I.see('knime.workspace', `${firstTableRow}:nth-child(3)`);
});

Scenario('Select multiple nodes', ({ I }) => {
    // Shift + Click to select 2 nodes.
    I.click({ nodeId: 207 });
    I.pressKeyDown('Shift');
    I.click({ nodeId: 206 });
    I.pressKeyUp('Shift');
    I.see('To show the node output, please select only one node', outputContainer);
});

Scenario('Unselect Nodes', ({ I }) => {
    I.click(kanvas);
    I.see('To show the node output, please select a configured or executed node', outputContainer);
});

Scenario('Select again first Node', ({ I }) => {
    const firstTableRow = '.output-container table td';
    I.click({ nodeId: 207 });
    I.see('Row0', firstTableRow);
});
