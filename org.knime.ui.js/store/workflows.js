import Vue from 'vue';
import { loadWorkflow, getWorkflowIDs } from '~api';

export const state = () => ({
    workflow: null,
    openWorkflowIDs: []
});

export const mutations = {
    setWorkflow(state, workflow) {
        Vue.set(state, 'workflow', workflow);
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

export const getters = {
    getWorkflow: state => state.workflow
};
