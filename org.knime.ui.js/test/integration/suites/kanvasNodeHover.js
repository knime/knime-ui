/* eslint-disable prefer-arrow-callback,no-magic-numbers */
const loadWorkflow = require('../utils/loadWorkflow');

const launchTimeout = 5 * 1000;

const idToSelector = (id) => `[data-node-id="root:${id}"]`;
const nodeSelector = idToSelector(207);

module.exports = {
    'init app and open workflow': nightwatch => {
        // load workflow
        loadWorkflow(nightwatch, 'test-kanvasNodeInteraction');
        // check if ui is visible
        nightwatch.waitForElementVisible('#knime-ui svg', launchTimeout);
    },
    'verify workflow': nightwatch => {
        // start state
        nightwatch.assert.not.elementPresent('.action-executeNodes');

        // look for node (Data Generator)
        nightwatch.assert.visible(nodeSelector);

        // check state of node
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-yellow`);
    },
    'hover node': nightwatch => {
        // hover
        nightwatch.moveToElement('.hover-area', 5, 5);
        nightwatch.assert.visible('.action-executeNodes');

        nightwatch.moveToElement('#kanvas svg', 5, 5);
        nightwatch.assert.not.elementPresent('.action-executeNodes');
    }
};
