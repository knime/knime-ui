import { createApp } from 'vue';
import KnimeUI from './components/KnimeUI.vue';

import { silentLogger } from './plugins/logger';
import { initStore } from './store';
import { router } from './router';
import { initPlugins } from './plugins';

import './assets/index.css';

// Setup logger for production
silentLogger();

// required for dynamically loaded components which will access the Vue instance
// off of the window object
// TODO: this is needed to dynamically loaded components. Bring back when external dependencies are migrated
// e.g: TableView, NodeDialog, PageBuilder
// window.Vue = Vue;

// Create Vue app
const app = createApp(KnimeUI);

// Provide store and init plugins
const store = initStore();
initPlugins({ app, store, router });

app.use(store);
app.use(router);
app.mount('#app');

