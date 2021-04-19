/* eslint-disable prefer-arrow-callback,no-magic-numbers */
const loadWorkflow = require('../utils/loadWorkflow');
const modifierKey = require('../utils/modifierKey');

const launchTimeout = 5 * 1000;

const idToSelector = (id) => `[data-node-id="root:${id}"]`;
const componentSelector = idToSelector(3);
const doubleClickOffset = { x: 50, y: 50 };

module.exports = {
    before: nightwatch => {
        // load workflow
        loadWorkflow(nightwatch, 'test-navigateThroughWorkflow');
        // check if ui is visible
        nightwatch.waitForElementVisible('#knime-ui svg', launchTimeout);
    },
    'verify workflow': nightwatch => {
        // start state
        nightwatch.assert.not.elementPresent('.action-executeNodes');

        // look for node (Data Generator)
        nightwatch.assert.visible(componentSelector);

        // check state of node
        nightwatch.assert.elementPresent(`${componentSelector} .traffic-light-yellow`);
    },
    'check for panel meta info': nightwatch => {
        // start state
        nightwatch.assert.containsText('#metadata .metadata', 'Navigate-through-workflow');
        nightwatch.assert.containsText(
            '#metadata .metadata',
            '* navigation into components and metanodes and back and'
        );
    },
    'open component': nightwatch => {
        // ctrl + doubleClick
        nightwatch.doubleClickElement({
            selector: `${componentSelector} .hover-area`,
            offset: doubleClickOffset,
            modifierKey
        });
        nightwatch.assert.containsText('#metadata .outports', 'Output ports');
        nightwatch.assert.containsText('#metadata .outports', 'TestData');
    },
    'open metanode': nightwatch => {
        nightwatch.doubleClickElement({
            selector: `${idToSelector('3:0:6')} .hover-area`,
            offset: doubleClickOffset
        });

        nightwatch.assert.elementPresent(idToSelector('3:0:6:2'));
        nightwatch.assert.not.elementPresent('#metadata');
    },
    'navigate via breadcrumb back to component': nightwatch => {
        nightwatch.click({ selector: 'nav.breadcrumb li', index: 1 });

        nightwatch.assert.elementPresent('#metadata');
        nightwatch.assert.containsText('#metadata .outports', 'Output ports');
        nightwatch.assert.elementPresent(idToSelector('3:0:6'));
    },

    'navigate via breadcrumb back to root': nightwatch => {
        nightwatch.click({ selector: 'nav.breadcrumb li', index: 0 });

        nightwatch.assert.elementPresent('#metadata');
        nightwatch.assert.containsText('#metadata', 'Navigate-through-workflow');
        nightwatch.assert.elementPresent(idToSelector('3'));
    }

};
