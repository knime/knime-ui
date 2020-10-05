import consola from 'consola';
import rpc from './json-rpc-adapter.js';

/**
 * Fetch "application state", that is: opened tabs etc.
 * This is designed to be called on application startup.
 * @return {Promise} A promise containing the application state as defined in the API
 */
export const fetchApplicationState = () => {
    const state = rpc('ApplicationService.getState');
    consola.debug('Current app state', state);

    if (state) {
        return Promise.resolve(state);
    } else {
        return Promise.reject(new Error('Empty response'));
    }
};

/**
 * Load a specific workflow.
 * @param {String} projectId The ID of the project to load
 * @return {Promise} A promise containing the workflow as defined in the API
 */
export const loadWorkflow = (projectId) => {
    const workflow = rpc('WorkflowService.getWorkflow', projectId, 'root');
    consola.debug('Loaded workflow', workflow);

    if (workflow) {
        return Promise.resolve(workflow);
    } else {
        return Promise.reject(new Error(`Couldn't load workflow ${projectId}`));
    }
};
