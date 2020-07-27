import mockWorkflow from '~/assets/mockdata/workflow1.json';
// import mockWorkflow from '~/assets/mockdata/wf_large.json';

// TODO: replace by data from the Gateway-API

export const loadWorkflow = () => ({
    ...mockWorkflow.workflow,
    name: 'Open Workflow'
});
