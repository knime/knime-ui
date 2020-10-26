import Vue from 'vue';
import consola from 'consola';
import { level } from '~/jest-logger.config';

consola.level = level;


// Workaround for https://github.com/vuejs/vue/issues/11575
// Can be removed as soon as that ticket is resolved.
const { getTagNamespace } = Vue.config;
Vue.config.getTagNamespace = (tag) => {
    if (tag.toLowerCase() === 'foreignobject') {
        return 'svg';
    }
    return getTagNamespace(tag);
};
