/* eslint-disable prefer-arrow-callback */
/**
 * Init app and load workflow.
 * This impl uses Java Browser functions implemented in JCEF Browser view (see org.knime.ui.java)
 * @param {{execute: Function}} browser - nightwatch instance ('execute' is called).
 * @param {String} workflowProjectId
 * @param {String} [workflowId]
 * @returns {void}
 */
module.exports = (browser, workflowProjectId, workflowId = 'root') => {

    // init params object
    const initParams = {
        openedWorkflows: [{
            projectId: workflowProjectId,
            workflowId,
            visible: true
        }]
    };

    // clear app
    // NOTE: execute requires the use of es5 style `function() { }`, es6 arrow functions are NOT supported!
    browser.execute(function () {
        window.clearAppForTesting();
    });

    // open workflow (project)
    // NOTE: this must happen in two different execute calls, otherwise the `window.location` will not change
    browser.execute(function (initParams) {
        window.initAppForTesting(initParams);
    }, [JSON.stringify(initParams)]);
};
