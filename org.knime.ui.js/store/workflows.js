import Vue from 'vue';
import { loadWorkflow } from '~api';

export const state = () => ({
    workflow: null
});

export const mutations = {
    setWorkflow(state, workflow) {
        Vue.set(state, 'workflow', workflow);
    }
};

export const actions = {
    async load({ commit }) {
        const workflow = await loadWorkflow();
        commit('setWorkflow', workflow);
    }
};

export const getters = {

};
