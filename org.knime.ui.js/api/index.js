import consola from 'consola';

const rpc = (method, ...args) => {
    const req = {
        jsonrpc: '2.0',
        method,
        params: args,
        id: 0
    };
    consola.trace('JSON-RPC:', req);

    let response = window.jsonrpc(JSON.stringify(req));

    try {
        response = JSON.parse(response);
    } catch (e) {
        throw new Error(`Could not be parsed to JSON: ${response}`);
    }
    return response.result;
};

export const fetchApplicationState = () => {
    const state = rpc('ApplicationService.getState');
    consola.debug('Current app state', state);

    if (state) {
        return Promise.resolve(state);
    } else {
        return Promise.reject(new Error('Empty response'));
    }
};

export const loadWorkflow = (projectId) => {
    const workflow = rpc('WorkflowService.getWorkflow', projectId, 'root');
    consola.debug('Loaded workflow', workflow);

    if (workflow) {
        return Promise.resolve(workflow);
    } else {
        return Promise.reject(new Error(`Couldn't load workflow ${projectId}`));
    }
};
