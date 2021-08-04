const Helper = require('@codeceptjs/helper');

class Workflow extends Helper {
    /**
    * Load a specific workflow.
    * @param {String} projectId ID of the project to load
    * @param {String} workflowId ID of the component / metanode that contains the workflow, or "root" for the
    *   top-level workflow. Defaults to 'root'.
    */
    async loadWorkflow(projectId, workflowId = 'root') {
        let { page } = this.helpers.Puppeteer;

        const initParameters = {
            openedWorkflows: [{
                projectId,
                workflowId,
                visible: true
            }]
        };
        await page.evaluate(() => {
            window.clearAppForTesting();
        });
        
        // TODO EQEXT-25 Research alternative solution about loadWorkflow integration test method
        await page.waitForFunction('window.initAppForTesting !== "undefined"');
        
        await page.evaluate((workflow) => {
            window.initAppForTesting(workflow);
        }, JSON.stringify(initParameters));
    }
}

module.exports = Workflow;
