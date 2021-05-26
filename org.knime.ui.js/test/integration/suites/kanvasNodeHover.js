/* eslint-disable prefer-arrow-callback,no-magic-numbers */
const loadWorkflow = require('../utils/loadWorkflow');

const launchTimeout = 5 * 1000;

const idToSelector = (id) => `[data-node-id="root:${id}"]`;
const nodeSelector = idToSelector(207);

const actionButtonSelector = '.action-button.action-execute';

module.exports = {
    before: nightwatch => {
        // load workflow
        loadWorkflow(nightwatch, 'test-kanvasNodeInteraction');
        // check if ui is visible
        nightwatch.waitForElementVisible('#knime-ui svg', launchTimeout);
    },
    'verify workflow': nightwatch => {
        // start state
        nightwatch.assert.not.elementPresent(actionButtonSelector);

        // look for node (Data Generator)
        nightwatch.assert.visible(nodeSelector);

        // check state of node
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-yellow`);
    },
    'hover node': nightwatch => {
        // hover
        nightwatch.moveToElement(`${nodeSelector} .hover-area`, 50, 50);
        nightwatch.assert.visible(actionButtonSelector);

        nightwatch.moveToElement('#kanvas svg', 5, 5);
        nightwatch.assert.not.elementPresent(actionButtonSelector);
    }
};
