// let { response: { result: { openedWorkflows } } } = require('../assets/loadApplicationState.json');
// let expected = openedWorkflows[0].activeWorkflow.workflow;

let timeout = 3 * 1000;

module.exports = {
    'open app': nightwatch => {
        nightwatch
            .waitForElementVisible('#knime-ui svg', timeout);

        /*
        nightwatch.assert.containsText('#metadata h2', expected.projectMetadata.title,
            'Workflow title in metadata panel');
        nightwatch.assert.containsText('#metadata .description', expected.projectMetadata.description,
            'Workflow description in metadata panel');

        nightwatch.assert.elementCount('#kanvas > svg > path', Object.entries(expected.connections).length,
            'Connectors are drawn on canvas');
        nightwatch.assert.elementCount('#kanvas > svg > path ~ g:not(.vue-portal-target)',
            Object.keys(expected.nodes).length, 'Nodes are drawn on canvas');
        */

        nightwatch.pause(1000);

        nightwatch.execute(function () {
            document.body.style.fontSize = '100px';
            document.body.style.lineHeight = '100vh';
            document.body.style.textAlign = 'center';
            document.body.textContent = '👍';
        });

        nightwatch.pause(2000);

        nightwatch.execute(function () {
            location.reload();
        });


    }
};
