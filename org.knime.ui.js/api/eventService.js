import rpc from './json-rpc-adapter';

const makeToggleEventListener = addOrRemove => async (type, args = {}) => {
    try {
        consola.debug(addOrRemove, 'event listener', type, args);
        await rpc(`EventService.${addOrRemove}EventListener`, {
            typeId: `${type}EventType`,
            ...args
        });
    } catch (e) {
        consola.error(e);
        let verb = addOrRemove === 'add' ? 'register' : 'unregister';
        throw new Error(`Couldn't ${verb} event "${type}" with args ${JSON.stringify(args)}`);
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
