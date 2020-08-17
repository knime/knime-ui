import Vue from 'vue';
import { getWorkflowIDs, loadWorkflow } from '~api';

export const state = () => ({
    workflow: null,
    openWorkflowIDs: []
});

export const mutations = {
    setWorkflow(state, workflow) {
        // extract nodes
        let nodes = workflow.nodes;
        let nodeIds = Object.keys(nodes);
        let workflowData = {
            ...workflow,
            nodeIds
        };
        // …and move them to Nodes store
        nodeIds.forEach((nodeId) => {
            this.commit('nodes/add', {
                nodeId,
                workflowId: workflow.id,
                nodeData: nodes[nodeId]
            }, { root: true });
        });
        delete workflowData.nodes;

        // extract templates
        let nodeTemplates = workflow.nodeTemplates;
        let nodeTemplateIds = Object.keys(nodeTemplates);
        // …and move them to template store
        nodeTemplateIds.forEach((templateId) => {
            this.commit('nodeTemplates/add', {
                templateId,
                templateData: nodeTemplates[templateId]
            }, { root: true });
        });
        delete workflowData.nodeTemplates;

        Vue.set(state, 'workflow', workflowData);
    },
    setOpenWorkflowIDs(state, workflowIDs) {
        state.openWorkflowIDs = workflowIDs;
    }
};

export const actions = {
    async fetchOpenWorkflowIDs({ commit }) {
        const ids = await getWorkflowIDs();
        commit('setOpenWorkflowIDs', ids);
    },
    async load({ commit }, id) {
        const workflow = await loadWorkflow(id);
        commit('setWorkflow', workflow);
    }
};
