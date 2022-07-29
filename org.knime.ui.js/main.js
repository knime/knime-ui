import Vue from 'vue';
import KnimeUI from './components/KnimeUI.vue';
import router from './router';
import store from './store';
import { initPlugins } from './plugins';

initPlugins(Vue);

import './assets/index.css';

Vue.config.productionTip = false;

new Vue({
    router,
    store,
    render: h => h(KnimeUI)
}).$mount('#app');
