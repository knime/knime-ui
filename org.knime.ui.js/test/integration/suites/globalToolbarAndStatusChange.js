/* eslint-disable prefer-arrow-callback,no-magic-numbers */
const loadWorkflow = require('../utils/loadWorkflow');
const selectors = require('../utils/selectors');

const launchTimeout = 5 * 1000;
const waitNodeTimeout = 16 * 1000;

const idToSelector = (id) => `[data-node-id="root:${id}"]`;
const waitNodeSelector = idToSelector(3);
const dataGeneratorSelector = idToSelector(2);

module.exports = {
    before: nightwatch => {
        // load workflow
        loadWorkflow(nightwatch, 'test-globalToolbarAndStatusChange');
        // check if ui is visible
        nightwatch.waitForElementVisible('#knime-ui svg', launchTimeout);
    },
    'verify workflow': nightwatch => {
        // look for node (Data Generator)
        nightwatch.assert.visible(waitNodeSelector);

        // check state of node
        nightwatch.assert.elementPresent(`${waitNodeSelector} .traffic-light-yellow`);
    },
    'execute workflow via toolbar button': nightwatch => {
        nightwatch.click(selectors.executeAllButton);
        nightwatch.waitForElementVisible(`${waitNodeSelector} .progress-circle`);
    },
    'cancel workflow': nightwatch => {
        nightwatch.click(selectors.cancelAllButton);

        nightwatch.waitForElementVisible(`${waitNodeSelector} .traffic-light-yellow`);
        nightwatch.assert.visible(`${waitNodeSelector} .warning`);

        nightwatch.assert.visible(`${dataGeneratorSelector} .traffic-light-red`);
    },
    'execute workflow again': nightwatch => {
        nightwatch.click(selectors.executeAllButton);
        nightwatch.waitForElementVisible(`${waitNodeSelector} .progress-circle`);

        nightwatch.waitForElementVisible(`${waitNodeSelector} .traffic-light-green`, waitNodeTimeout);
        nightwatch.assert.visible(`${dataGeneratorSelector} .traffic-light-green`);
    }
};
