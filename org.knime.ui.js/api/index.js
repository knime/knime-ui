import rpc, { parseResponse } from './json-rpc-adapter.js';
export * from './workflowCommands.js';
export * from './portRPCs';

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

/**
 * Search the node repository via RPC.
 *
 * @param {String} cfg.query - query for specific matches in the returned nodes or empty string.
 * @param {Array} cfg.tags - tags to filter the results of the search.
 * @param {Boolean} cfg.allTagsMatch - if the tags are inclusive or exclusive.
 * @param {Number} cfg.nodeOffset - the numeric offset of the search (for pagination).
 * @param {Number} cfg.nodeLimit - the number of results which should be returned.
 * @param {Boolean} cfg.fullTemplateInfo - if the results should contain all node info (incl. img data).
 * @returns {Object} the node repository search results.
 */
export const searchNodes = ({ query, tags, allTagsMatch, nodeOffset, nodeLimit, fullTemplateInfo }) => {
    try {
        const nodes = rpc(
            'NodeRepositoryService.searchNodes',
            query,
            tags,
            allTagsMatch,
            nodeOffset,
            nodeLimit,
            fullTemplateInfo
        );
        consola.debug('Loaded nodes', nodes);

        return Promise.resolve(nodes);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Couldn't search nodes "${query}" with tags "${tags}"`));
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
 * Do Action on nodes or an entire workflow.
 * @param {'reset' | 'execute' | 'cancel'} cfg.action
 * @param {String} cfg.projectId
 * @param {String} cfg.workflowId
 * @param {Array=} cfg.nodeIds The nodes to act upon. Optional.
 *     If you want to execute an entire workflow, pass nothing.
 * @returns {Promise}
 */
export const changeNodeState = ({ projectId, workflowId, nodeIds = [], action }) => {
    try {
        let result = rpc('NodeService.changeNodeStates', projectId, workflowId, nodeIds, action);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Could not ${action} nodes ${nodeIds}`));
    }
};

/**
 * Actions for LoopExecution.
 * @param {'step' | 'pause' | 'resume'} cfg.action
 * @param {String} cfg.projectId
 * @param {String} cfg.workflowId
 * @param {String} cfg.nodeId The node to act upon.
 * @returns {Promise}
 */
export const changeLoopState = ({ projectId, workflowId, nodeId, action }) => {
    try {
        let result = rpc(`NodeService.changeLoopState`, projectId, workflowId, nodeId, action);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Could not ${action} node ${nodeId}`));
    }
};

/**
 * Open the native (Java) configuration dialog of a node.
 * @param {String} projectId
 * @param {String} nodeId The node for which to open the dialog.
 * @returns {void}
 */
export const openDialog = ({ projectId, nodeId }) => {
    try {
        // returns falsy on success
        let error = window.openNodeDialog(projectId, nodeId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open dialog of node ${nodeId}`, e);
    }
};

/**
 * Open the native (Java) view window of a node.
 * @param {String} projectId
 * @param {String} nodeId The node for which to open the view.
 * @returns {void}
 */
export const openView = ({ projectId, nodeId }) => {
    try {
        // returns falsy on success
        let error = window.openNodeView(projectId, nodeId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open view of node ${nodeId}`, e);
    }
};


/**
 * Generates workflow commands that are part of the undo/redo stack
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param {String} cfg.command name of the command to be executed
 * @param {String} cfg.args arguments for the command
 * @returns {Promise}
 */
export const workflowCommand = ({ projectId, workflowId, command, args }) => {
    try {
        let rpcArgs = {
            kind: command,
            ...args
        };
        let result = rpc(`WorkflowService.executeWorkflowCommand`, projectId, workflowId, rpcArgs);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Couldn't execute ${command}(${args})`));
    }
};

/**
 * Performs an undo command
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns {Promise}
 */
let undoWorkflowCommand = ({ projectId, workflowId }) => {
    try {
        let result = rpc(`WorkflowService.undoWorkflowCommand`, projectId, workflowId);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error('Couldn\'t undo'));
    }
};

/**
 * Performs a redo command
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns {Promise}
 */
let redoWorkflowCommand = ({ projectId, workflowId }) => {
    try {
        let result = rpc(`WorkflowService.redoWorkflowCommand`, projectId, workflowId);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error('Couldn\'t redo'));
    }
};

/**
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns { Promise } Promise
 */
export const undo = ({ projectId, workflowId }) => undoWorkflowCommand({
    projectId,
    workflowId
});

/**
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns { Promise } Promise
 */
// eslint-disable-next-line arrow-body-style
export const redo = ({ projectId, workflowId }) => {
    return redoWorkflowCommand({
        projectId,
        workflowId
    });
};

// The Node service offers JSON-RPC forwarding to the Port instance.
// This is by design, because third-party vendors can provide a custom port implementation with totally
// different methods. In case of a data port (table), the available methods are defined in
// org.knime.gateway.impl.rpc.*.*Service
// (at the time of writing getTable(long start, int size), getRows(long start, int size), and getFlowVariables())
// So, to get a table we have to send a JSON-RPC object as a payload to the NodeService, which itself must be called via
// JSON-RPC. Hence double-wrapping is required.
// Parameters are described below.
export const portRPC = ({ method, params, projectId, workflowId, nodeId, portIndex }) => {
    let nestedRpcCall = {
        jsonrpc: '2.0',
        id: 0,
        method,
        params
    };
    let response = rpc(
        'NodeService.doPortRpc',
        projectId, workflowId, nodeId, portIndex, JSON.stringify(nestedRpcCall)
    );
    return parseResponse({ response, method, params });
};
