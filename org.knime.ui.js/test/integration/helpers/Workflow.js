const KnimeHelper = require('./KnimeHelper');
const { _getNodeSelector } = require('./util/KnimeNodeUtil');

class Workflow extends KnimeHelper {
    /**
    * Load a specific workflow.
    * @param {String} projectId ID of the project to load
    * @param {String} workflowId ID of the component / metanode that contains the workflow, or "root" for the
    *   top-level workflow. Defaults to 'root'.
    */
    async loadWorkflow(projectId, workflowId = 'root') {
        const page = this.helpers.Puppeteer.page;
    
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

    /**
     * Select multiple connectors.
     * @param {Object} selectors - The sourceNode and destNode of a connector
     */
    async selectMultipleConnectors(...selectors) {
        if (selectors.length === 0) {
            throw new Error('No connectors selected');
        } else {
            const page = await this._getPage();
            await page.keyboard.down('Shift');
        
            for (let i = 0; i < selectors.length; i++) {
                const selector = _getNodeSelector(selectors[i]);
                await page.click(selector);
            }
    
            await page.keyboard.up('Shift');
        }
    }

    /**
    * @param {String|Number} selector 'fit' for Fit To Screen or Number to specific zoom.
    */
    async selectZoom(selector) {
        const page = await this._getPage();
        if (selector === 'fit') {
            await page.click('#toolbar > div.zoom.zoommenu.submenu > button > svg');
            await page.click('#toolbar > div.zoom.zoommenu.submenu > ul > li:nth-child(1) > a');
        }
        if (typeof selector === 'number') {
            await page.click('#toolbar > div.zoom.zoommenu.submenu > button > div');
            await page.keyboard.type(selector.toString());
            await page.keyboard.press('Enter');
        }
    }
}

module.exports = Workflow;
