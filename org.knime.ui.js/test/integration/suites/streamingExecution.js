/* eslint-disable prefer-arrow-callback,no-magic-numbers,no-unused-expressions */
const loadWorkflow = require('../utils/loadWorkflow');

const launchTimeout = 5 * 1000;

const idToSelector = (id) => `[data-node-id="root:${id}"]`;
const nodeSelector = idToSelector(6);

module.exports = {
    'init app and open workflow': nightwatch => {
        // load workflow
        loadWorkflow(nightwatch, 'test-streamingExecution');
        // check if ui is visible
        nightwatch.waitForElementVisible('#knime-ui svg', launchTimeout);
    },
    'verify workflow': nightwatch => {
        // start state
        nightwatch.expect.element('.action-executeNodes').not.to.be.present;

        // look for node (Data Generator)
        nightwatch.expect.element(nodeSelector).to.be.visible;

        // check state of node
        nightwatch.expect.element(`${nodeSelector} .traffic-light-yellow`).to.be.present;
    },
    'check for streaming decorator': nightwatch => {
        nightwatch.expect.element(`${nodeSelector} .streamable`).to.be.visible;
    },
    'open component': nightwatch => {
        nightwatch.keys(nightwatch.Keys.CONTROL);
        nightwatch.moveToElement(`${nodeSelector}  .hover-area`, 50, 50);
        // NOTE: double click does not offer a selector
        nightwatch.doubleClick();
        nightwatch.keys(nightwatch.Keys.NULL);
    },
    'check for global decorator': nightwatch => {
        nightwatch.expect.element('.type-notification.onlyStreaming').to.be.visible;
    },
    'check for supported and not supported decorators on nodes': nightwatch => {
        nightwatch.expect.element(`${idToSelector('6:0:1')} .streamable`).to.be.visible;
        nightwatch.expect.element(`${idToSelector('6:0:2')} .streamable`).to.be.visible;
        nightwatch.expect.element(`${idToSelector('6:0:3')} .streamable`).to.be.visible;
        nightwatch.expect.element(`${idToSelector('6:0:8')} .not-streamable`).to.be.visible;
        nightwatch.expect.element(`${idToSelector('6:0:6')} .streamable`).to.be.visible;
        nightwatch.expect.element(`${idToSelector('6:0:7')} .streamable`).to.be.visible;
    },
    'navigate to workflow via breadcrumb': nightwatch => {
        nightwatch.click({ selector: 'nav.breadcrumb li', index: 0 });
    },
    'execute workflow': nightwatch => {
        nightwatch.click({ selector: '.buttons button', index: 0 });
    },
    're-open workflow': nightwatch => {
        // open workflow
        nightwatch.keys(nightwatch.Keys.CONTROL);
        nightwatch.moveToElement(`${nodeSelector}  .hover-area`, 50, 50);
        nightwatch.doubleClick();
        nightwatch.keys(nightwatch.Keys.NULL);
    },
    'check for streaming connector count update': async nightwatch => {
        const streamingLabelSelector = (index = 1) => ({ selector: '.textWrapper .streamingLabel', index });
        nightwatch.expect.element(streamingLabelSelector()).to.be.visible.after(200);

        // check for updating counter
        nightwatch.expect.element(streamingLabelSelector()).text.to.not.equal(null).after(500);

        nightwatch.pause(1000);

        // get current text on streamingLabel
        const text = await nightwatch.getText(streamingLabelSelector());

        nightwatch.expect.element(streamingLabelSelector()).text.to.not.equal(text.value).after(1000);
    }
};
