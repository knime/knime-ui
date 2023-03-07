import * as Vue from 'vue';
import KnimeUI from './components/KnimeUI.vue';

import { silentLogger } from './plugins/logger';
import { initStore } from './store';
import { router } from './router';
import { initPlugins } from './plugins';
import { setupAPI } from './api/setup';

import './assets/index.css';

// Setup logger for production
silentLogger();

// required for dynamically loaded components which will access the Vue instance off of the window object
// e.g: TableView, NodeDialog, PageBuilder
window.Vue = Vue;

setupAPI();

// Create Vue app
const app = Vue.createApp(KnimeUI);

// Provide store and init plugins
const store = initStore();

// Enable easier store debugging while on dev
if (import.meta.env.DEV) {
    window.store = store;
}

initPlugins({ app, store, router });

app.use(store);
app.use(router);
app.mount('#app');

