import { createApp } from 'vue';
import KnimeUI from './components/KnimeUI.vue';

import { silentLogger } from './plugins/logger';
import { initStore } from './store';
import { initPlugins } from './plugins';

import './assets/index.css';

// Setup logger for production
silentLogger();

// Create Vue app
const app = createApp(KnimeUI);

// Provide store and init plugins
const store = initStore();
initPlugins(app, store);

app.use(store);
app.mount('#app');

// map all nuxt-links to router links,
// since nuxt-link inherits from RouterLink and we don't need use nuxt
// const RouterLink = app.$options.components.RouterLink;
// Vue.component('NuxtLink', RouterLink);

// required for dynamically loaded components which will access the Vue instance
// off of the window object
// window.Vue = Vue;
