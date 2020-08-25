// TODO: adjust implementations of all functions to final version of InitService (NXT-186)
let rpcWorkflows = [];

const fetchFromAP = () => {
    const req = {
        jsonrpc: '2.0',
        method: 'InitService.getWorkflows',
        id: 0
    };
    let response = window.jsonrpc(JSON.stringify(req));

    response = JSON.parse(response);
    rpcWorkflows = response.result.filter(Boolean).map(r => r.workflow);
};

export const loadWorkflow = (id) => {
    if (!rpcWorkflows.length) {
        fetchFromAP();
    }
    let workflow;
    workflow = rpcWorkflows.find(workflow => workflow.name === id);

    if (!workflow) { return Promise.resolve(null); }

    return Promise.resolve({
        ...workflow,
        id,
        name: id
    });
};

export const getWorkflowIDs = () => {
    fetchFromAP();
    return Promise.resolve(rpcWorkflows.map(workflow => workflow.name));
};
