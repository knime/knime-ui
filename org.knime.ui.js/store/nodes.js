import Vue from 'vue';
/*
 * This store contains the node instances in all workflows.
 * Structure:
 * @example
 *
 * {
 *     workflow1 : {
 *         node1: { … },
 *         node2: { … },
 *         …
 *     },
 *     …
 * }
 */
export const state = () => ({});

export const mutations = {
    add(state, { nodeId, nodeData, workflowId }) {
        if (!Reflect.has(state, workflowId)) {
            Vue.set(state, workflowId, {});
        }
        Vue.set(state[workflowId], nodeId, nodeData);
    }
};

export const getters = {
    icon(state, getters, rootState) {
        return ({ workflowId, nodeId }) => {
            let node = state[workflowId][nodeId];
            let { templateId } = node;
            if (templateId) {
                return rootState.nodeTemplates[templateId].icon;
            } else {
                return node.icon;
            }
        };
    },

    name(state, getters, rootState) {
        return ({ workflowId, nodeId }) => {
            let node = state[workflowId][nodeId];
            let { templateId } = node;
            if (templateId) {
                return rootState.nodeTemplates[templateId].name;
            } else {
                return node.name;
            }
        };
    },

    type(state, getters, rootState) {
        return ({ workflowId, nodeId }) => {
            let node = state[workflowId][nodeId];
            let { templateId } = node;
            if (templateId) {
                return rootState.nodeTemplates[templateId].type;
            } else {
                return node.type;
            }
        };
    }
};
