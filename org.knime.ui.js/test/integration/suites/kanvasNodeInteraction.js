/* eslint-disable prefer-arrow-callback,no-magic-numbers */

const timeout = 3 * 1000;
const launchTimeout = 5 * 1000;
const runTimeout = 8 * 1000;

const nodeId = 'root:207';
const nodeSelector = `[data-node-id="${nodeId}"]`;

module.exports = {
    'init app and open workflow': nightwatch => {
        // open workflow (project)
        nightwatch.execute(function () {
            window.initAppForTesting(JSON.stringify({
                openedWorkflows: [{
                    projectId: 'test-kanvasNodeInteraction',
                    workflowId: 'root',
                    visible: true
                }]
            }));
        });
        // check if ui is visible
        nightwatch.waitForElementVisible('#knime-ui svg', launchTimeout);
    },
    'verify workflow': nightwatch => {
        // start state
        nightwatch.assert.not.elementPresent('.action-executeNodes');
        nightwatch.assert.containsText('#node-output',
            'To show the node output, please select a configured or executed node');

        // look for node (Data Generator)
        nightwatch.assert.visible(nodeSelector);
        // check state of node
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-yellow`);
    },
    'simple node interaction': nightwatch => {
        // hover
        // TODO: fix hover - might not work?
        /*
        nightwatch.moveToElement(`${nodeSelector} .hover-area`, 20, 15);
        nightwatch.assert.visible('.action-executeNodes');
        nightwatch.moveToElement(`#kanvas`, 5, 5);
        nightwatch.assert.not.visible('.action-executeNodes');
        */

        // click
        nightwatch.click(nodeSelector);
        nightwatch.assert.visible('.action-executeNodes');
        nightwatch.assert.not.cssClassPresent('.action-executeNodes', 'disabled');
    },
    'run node via node actions': nightwatch => {
        // run node
        nightwatch.click('.action-executeNodes');

        // look for progress bar
        nightwatch.waitForElementPresent('.progress-bar', timeout);

        // wait to finish execution
        nightwatch.waitForElementVisible('#node-output .table', runTimeout);


        // check state should be green
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-green`);

        // check for table
        nightwatch.assert.containsText('#node-output', 'Universe_0_1');

        // check button states
        nightwatch.assert.cssClassPresent('.action-executeNodes', 'disabled');
        nightwatch.assert.not.cssClassPresent('.action-resetNodes', 'disabled');
    },
    'reset node': nightwatch => {
        // reset node
        nightwatch.click('.action-resetNodes');

        // check table
        nightwatch.waitForElementVisible('#node-output .node-output-execute', runTimeout);
        nightwatch.assert.containsText('#node-output', 'To show the output table, please execute the selected node');

        // check for state
        nightwatch.assert.not.elementPresent(`${nodeSelector} .traffic-light-green`);
        nightwatch.assert.elementPresent(`${nodeSelector} .traffic-light-yellow`);
    },
    'run node via output execute button': nightwatch => {
        nightwatch.click('#node-output .node-output-execute');
        nightwatch.waitForElementVisible('#node-output .table', runTimeout);
        nightwatch.assert.containsText('#node-output', 'Universe_0_1');
        nightwatch.assert.cssClassPresent('.action-executeNodes', 'disabled');
        nightwatch.assert.not.cssClassPresent('.action-resetNodes', 'disabled');
    },
    'unselect node': nightwatch => {
        // un-select node (removes action bar)
        nightwatch.click('#kanvas > svg');
        nightwatch.assert.not.elementPresent('.action-executeNodes');
    }
};
