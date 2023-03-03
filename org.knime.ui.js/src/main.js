import * as Vue from 'vue';
import KnimeUI from './components/KnimeUI.vue';

import { silentLogger } from './plugins/logger';
import { initStore } from './store';
import { router } from './router';
import { initPlugins } from './plugins';

import './assets/index.css';

// Setup logger for production
silentLogger();

// required for dynamically loaded components which will access the Vue instance off of the window object
// e.g: TableView, NodeDialog, PageBuilder
window.Vue = Vue;

if (window.EquoCommService) {
    window.EquoCommService.on(
        'org.knime.ui.java.jsonrpcNotification',
        (jsonrpcNotification) => window.jsonrpcNotification(jsonrpcNotification),
        // eslint-disable-next-line no-console
        e => console.error(e)
    );

    if (!window.jsonrpc) {
        window.jsonrpc = request => window.EquoCommService.send('org.knime.ui.java.jsonrpc', JSON.stringify(request));
    }
}

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

