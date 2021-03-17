/* eslint-disable prefer-arrow-callback,no-magic-numbers */
const loadWorkflow = require('../utils/loadWorkflow');

const launchTimeout = 5 * 1000;
const runTimeout = 8 * 1000;

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
        nightwatch.assert.containsText(
            '#node-output',
            'To show the node output, please select a configured or executed node'
        );

        // look for node (Data Generator)
        nightwatch.assert.visible(nodeSelector);
        // check state of node
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-yellow`);
    },
    'check output': nightwatch => {
        // run node
        nightwatch.click(nodeSelector);
        nightwatch.assert.visible('.action-executeNodes');
        nightwatch.click('.action-executeNodes');

        // wait to finish execution
        nightwatch.waitForElementVisible('#node-output .table', runTimeout);
    },
    'switch output tab': nightwatch => {
        const outputButtonsSelector = '#node-output [name="output-port"] + span';
        const tdSelector = '#node-output .table td';

        nightwatch.assert.containsText(tdSelector, 'Row0');

        nightwatch.click({ selector: outputButtonsSelector, index: 1 });
        nightwatch.assert.containsText(tdSelector, 'Cluster_0');

        nightwatch.click({ selector: outputButtonsSelector, index: 0 });
        nightwatch.assert.containsText(tdSelector, 'Row0');

        // TODO: open flow variables when NXT-164 is merged
        // nightwatch.click({ selector: '#node-output [name="output-port"]', index: 3 });

    },
    'select multiple nodes': nightwatch => {
        nightwatch.click(nodeSelector);

        // shift + click
        nightwatch.keys(nightwatch.Keys.SHIFT);
        nightwatch.click(idToSelector(206));
        nightwatch.keys(nightwatch.Keys.NULL);

        nightwatch.assert.containsText(
            '#node-output',
            'To show the node output, please select only one node'
        );
    },
    'unselect nodes': nightwatch => {
        nightwatch.click('#kanvas > svg');
        nightwatch.assert.containsText(
            '#node-output',
            'To show the node output, please select a configured or executed node'
        );
    },
    're-select executed node': nightwatch => {
        nightwatch.click(nodeSelector);
        const tdSelector = '#node-output .table td';
        nightwatch.assert.containsText(tdSelector, 'Row0');
    }
};
