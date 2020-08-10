// TODO: adjust implementations of all functions to final version of InitService (NXT-186)
let RPCworkflows = [];

const fetchFromAP = () => {
    const req = {
        jsonrpc: '2.0',
        method: 'InitService.getWorkflows',
        id: 0
    };
    let response = window.jsonrpc(JSON.stringify(req));

    response = JSON.parse(response);
    RPCworkflows = response.result.filter(Boolean).map(r => r.workflow);
};

export const loadWorkflow = (id) => {
    if (!RPCworkflows.length) {
        fetchFromAP();
    }
    let workflow;
    workflow = RPCworkflows.find(workflow => workflow.name === id);

    if (!workflow) { return Promise.resolve(null); }

    return Promise.resolve({
        ...workflow,
        id,
        name: id
    });
};

export const getWorkflowIDs = () => {
    if (!RPCworkflows.length) {
        fetchFromAP();
    }
    return Promise.resolve(RPCworkflows.map(workflow => workflow.name));
};
