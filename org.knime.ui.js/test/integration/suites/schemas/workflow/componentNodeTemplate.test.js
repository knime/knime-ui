const { part } = require('../../../plugins/locators');
const learnerHSL = 'hsl(70, 78.3%, 54.9%)'; // Lime orange
const visualizerHSL = 'hsl(193, 60.9%, 43.1%)'; // Dark turquoise

Feature('Component Node Template').tag('@schemas-@workflow-@componentNodeTemplate');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-componentNodeTemplate');

    I.seeElement({ nodeId: 2 });
    I.seeElement({ nodeId: 3 });
});

Scenario('Props of schema:', async ({ I }) => {
    __`Type:`;
    const learnerFill = await I.grabAttributeFrom({ nodeId: 2, part: part.TORSO }, 'fill');
    const visualizerFill = await I.grabAttributeFrom({ nodeId: 3, part: part.TORSO }, 'fill');

    I.assert(learnerFill, learnerHSL);
    I.assert(visualizerFill, visualizerHSL);
});

Scenario('Properties of schema:', ({ I }) => {
    __`Title:`;
    __`Description:`;
});
