// Workaround for https://github.com/vuejs/vue/issues/11575
// Can be removed as soon as that ticket is resolved.

import Vue from 'vue';

const { getTagNamespace } = Vue.config;
Vue.config.getTagNamespace = (tag) => {
    if (tag.toLowerCase() === 'foreignobject') {
        return 'svg';
    }
    return getTagNamespace(tag);
};
