import consola from 'consola';
import rpc from './json-rpc-adapter.js';

/**
 * Fetch "application state", that is: opened tabs etc.
 * This is designed to be called on application startup.
 * @return {Promise} A promise containing the application state as defined in the API
 */
export const fetchApplicationState = () => {
    try {
        const state = rpc('ApplicationService.getState');
        consola.debug('Current app state', state);

        return Promise.resolve(state);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error('Could not load application state'));
    }
};

/**
 * Load a specific workflow.
 * @param {String} projectId The ID of the project to load
 * @param {String} containerId The ID of the component / metanode that contains the workflow, or "root" for the
 *   top-level workflow. Defaults to `'root'`.
 * @return {Promise} A promise containing the workflow as defined in the API
 */
export const loadWorkflow = (projectId, containerId = 'root') => {
    try {
        const workflow = rpc('WorkflowService.getWorkflow', projectId, containerId);
        consola.debug('Loaded workflow', workflow);

        return Promise.resolve(workflow);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Couldn't load workflow "${containerId}" from project "${projectId}"`));
    }
};
