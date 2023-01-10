import Vue from 'vue';
import VueRouter from 'vue-router';
import KnimeUI from './components/KnimeUI.vue';
import { router } from './router';

import { silentLogger } from './plugins/logger';
import { initStore } from './store';
import { initPlugins } from './plugins';

import './assets/index.css';

// Setup for production
silentLogger();
Vue.config.productionTip = false;

// Init store and plugins
const store = initStore(Vue);
initPlugins(Vue, { store, router });

// Init router
Vue.use(VueRouter);

// required for dynamically loaded components which will access the Vue instance
// off of the window object
window.Vue = Vue;

// Create Vue app
const app = new Vue({
    router,
    store,
    render: h => h(KnimeUI)
}).$mount('#app');

// map all nuxt-links to router links,
// since nuxt-link inherits from RouterLink and we don't need use nuxt
const RouterLink = app.$options.components.RouterLink;
Vue.component('NuxtLink', RouterLink);
