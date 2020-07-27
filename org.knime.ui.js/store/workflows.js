import Vue from 'vue';
import { loadWorkflow } from '~/api';

export const state = {
    workflow: null
};

export const mutations = {
    setWorkflow(state, workflow) {
        Vue.set(state, 'workflow', workflow);
    }
};

export const actions = {
    load({ commit }) {
        const workflow = loadWorkflow();
        commit('setWorkflow', workflow);
    }
};

export const getters = {

};
