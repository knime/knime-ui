import Vue from 'vue';
/*
 * This store contains the node "classes", i.e. shared properties of all nodes of the same node type.
 * Structure:
 * @example
 *
 * {
 *  "org.knime.base.node.util.timerinfo.TimerinfoNodeFactory": {
 *     "name": "Timer Info",
 *     "type": "Sink",
 *     "icon": "data:image/png;base64,…"
 *   },
 *   …
 * }
 */
export const state = () => ({});

export const mutations = {
    add(state, { templateId, templateData }) {
        if (Reflect.has(state, templateId)) {
            return;
        }
        Vue.set(state, templateId, templateData);
    }
};
