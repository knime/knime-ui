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
 * @param {String} workflowId The ID of the component / metanode that contains the workflow, or "root" for the
 *   top-level workflow. Defaults to `'root'`.
 * @param {String} includeInfoOnAllowedActions Whether to enclose information on the actions
 *   (such as reset, execute, cancel) allowed on the contained nodes and the entire workflow itself.
 Defaults to `true`.
 * @return {Promise} A promise containing the workflow as defined in the API
 */
export const loadWorkflow = ({ projectId, workflowId = 'root', includeInfoOnAllowedActions = true }) => {
    try {
        const workflow = rpc('WorkflowService.getWorkflow', projectId, workflowId, includeInfoOnAllowedActions);
        consola.debug('Loaded workflow', workflow);

        return Promise.resolve(workflow);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Couldn't load workflow "${workflowId}" from project "${projectId}"`));
    }
};

const makeToggleEventListener = addOrRemove => (type, args) => {
    try {
        consola.debug(addOrRemove, 'event listener', type, args);
        rpc(`EventService.${addOrRemove}EventListener`, {
            typeId: `${type}EventType`,
            ...args
        });
        return Promise.resolve();
    } catch (e) {
        consola.error(e);
        let verb = addOrRemove === 'add' ? 'register' : 'unregister';
        return Promise.reject(new Error(`Couldn't ${verb} event "${type}" with args ${JSON.stringify(args)}`));
    }
};

/**
 * Add or remove event listeners.
 * @param {String} type The event type Id. Currently only `WorkflowChanged` is supported
 * @param {*} params Depending on the type Id, the event listener accepts different parameters:
 *
 *   'WorkflowChanged': // register to change events on a workflow
 *   {
 *       projectId, // project ID
 *       workflowId, // id of the workflow (i.e. 'root' or id of the node containing the WF)
 *       snapshotId // only required when adding an event listener, not required for removing
 *   }
 */
export const addEventListener = makeToggleEventListener('add');
export const removeEventListener = makeToggleEventListener('remove');


/**
 * Changes the state of one or multiple nodes.
 * @param {String} cfg.projectId
 * @param {Array} cfg.nodeIds The nodes to reset.
 *     If you want to perform this action on all nodes of the workflow, pass an array only containing the workflow container's id.
 * @param {'execute' | 'cancel' | 'reset'} cfg.action The action to perform on the nodes
 * @returns {Promise}
 */
export const changeNodeState = ({ projectId, nodeIds, action }) => {
    try {
        let result = rpc('NodeService.changeNodeStates', projectId, nodeIds, action);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Could not ${action.toUpperCase()} nodes`));
    }
};
