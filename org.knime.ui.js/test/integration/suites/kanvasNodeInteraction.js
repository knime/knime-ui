/* eslint-disable prefer-arrow-callback,no-magic-numbers */
const loadWorkflow = require('../utils/loadWorkflow');

const timeout = 3 * 1000;
const launchTimeout = 5 * 1000;
const runTimeout = 8 * 1000;

const nodeId = 'root:207';
const nodeSelector = `[data-node-id="${nodeId}"]`;
const executeButtonSelector = '.action-button.action-execute';
const resetButtonSelector = '.action-button.action-reset';


module.exports = {
    before: nightwatch => {
        // load workflow
        loadWorkflow(nightwatch, 'test-kanvasNodeInteraction');
        // check if ui is visible
        nightwatch.waitForElementVisible('#knime-ui svg', launchTimeout);
    },
    'verify workflow': nightwatch => {
        // start state
        nightwatch.assert.not.elementPresent(executeButtonSelector);

        // look for node (Data Generator)
        nightwatch.assert.visible(nodeSelector);
        // check state of node
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-yellow`);
    },
    'select node': nightwatch => {
        // click
        nightwatch.click(nodeSelector);
        nightwatch.assert.visible(executeButtonSelector);
        nightwatch.assert.not.cssClassPresent(executeButtonSelector, 'disabled');
    },
    'run node via node actions': nightwatch => {
        // run node
        nightwatch.click(executeButtonSelector);

        // look for progress bar
        nightwatch.waitForElementPresent('.progress-bar', timeout);

        // wait to finish execution
        nightwatch.waitForElementVisible('.output-container .table', runTimeout);


        // check state should be green
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-green`);

        // check for table
        nightwatch.assert.containsText('.output-container', 'Universe_0_1');

        // check button states
        nightwatch.assert.cssClassPresent(executeButtonSelector, 'disabled');
        nightwatch.assert.not.cssClassPresent(resetButtonSelector, 'disabled');
    },
    'reset node': nightwatch => {
        // reset node
        nightwatch.click(resetButtonSelector);

        // check table
        nightwatch.waitForElementVisible('.output-container .node-output-execute', runTimeout);
        nightwatch.assert.containsText('.output-container', 'To show the output table, please execute the selected node');

        // check for state
        nightwatch.assert.not.elementPresent(`${nodeSelector} .traffic-light-green`);
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-yellow`);
    },
    'run node via output execute button': nightwatch => {
        nightwatch.click('.output-container .node-output-execute');
        nightwatch.waitForElementVisible('.output-container .table', runTimeout);
        nightwatch.assert.containsText('.output-container', 'Universe_0_1');
        nightwatch.assert.cssClassPresent('.action-executeNodes', 'disabled');
        nightwatch.assert.not.cssClassPresent(resetButtonSelector, 'disabled');
    },
    'unselect node': nightwatch => {
        // un-select node (removes action bar)
        nightwatch.click('#kanvas > svg');
        nightwatch.assert.not.elementPresent('.action-executeNodes');
        nightwatch.end();
    }
};
