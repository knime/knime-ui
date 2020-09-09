import { fetchApplicationState, loadWorkflow as loadWorkflowFromApi } from '~api';
import consola from 'consola';

export const state = () => ({
    workflow: null,
    openedWorkflows: []
});

export const mutations = {
    setWorkflow(state, workflow) {
        consola.debug('setting workflow', workflow?.name, workflow?.projectId, workflow);

        // extract nodes
        let { nodes = {} } = workflow;
        let nodeIds = Object.keys(nodes);
        let workflowData = {
            ...workflow,
            nodeIds
        };

        // remove all existing nodes of this workflow from Nodes store
        this.commit('nodes/removeWorkflow', workflow.projectId, { root: true });

        // …and move all nodes to Nodes store
        nodeIds.forEach((nodeId) => {
            this.commit('nodes/add', {
                workflowId: workflow.projectId,
                nodeData: nodes[nodeId]
            }, { root: true });
        });
        delete workflowData.nodes;

        // extract templates
        let { nodeTemplates = {} } = workflow;
        let nodeTemplateIds = Object.keys(nodeTemplates);
        // …and move them to template store
        nodeTemplateIds.forEach((templateId) => {
            this.commit('nodeTemplates/add', {
                templateId,
                templateData: nodeTemplates[templateId]
            }, { root: true });
        });
        delete workflowData.nodeTemplates;

        state.workflow = workflowData;
    },
    setOpenedWorkflows(state, descriptors) {
        state.openedWorkflows = descriptors;
    }
};

export const actions = {
    async initState({ commit }) {
        const state = await fetchApplicationState();
        const { activeWorkflows, openedWorkflows } = state;

        commit('setOpenedWorkflows', openedWorkflows);

        // if there is an active workflow, show it
        if (activeWorkflows[0]) {
            commit('setWorkflow', activeWorkflows[0].workflow);
        }
    },
    async loadWorkflow({ commit }, id) {
        const workflow = await loadWorkflowFromApi(id);

        if (workflow) {
            commit('setWorkflow', workflow.workflow);
        } else {
            throw new Error(`workflow not found: ${id}`);
        }
    }
};
