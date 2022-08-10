/* istanbul ignore file */
import Vue from 'vue';
import KnimeUI from './components/KnimeUI.vue';
import router from './router';
import store from './store';
import { initPlugins } from './plugins';

import '@/assets/index.css';

Vue.config.productionTip = false;

initPlugins(Vue);

const app = new Vue({
    router,
    store,
    render: h => h(KnimeUI)
}).$mount('#app');

// map all nuxt-links to router links,
// since nuxt-link inherits from RouterLink and we don't need use nuxt
const RouterLink = app.$options.components.RouterLink;
Vue.component('NuxtLink', RouterLink);
