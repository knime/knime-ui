import commands from './commands';
import constants from './constants';
import { directiveMove } from './directive-move';
import events from './events';
// import logger from 'knime-ui/plugins/logger';

import consola from 'consola';

import store from '../store';

import PortalVue from 'portal-vue';

// import internalLogger from './logger';

const wrapPlugin = plugin => ({
    install(Vue) {
        let context = { store };

        let inject = (name, content) => {
            Vue.prototype[`$${name}`] = content;
        };

        plugin(context, inject);
    }
});
// window.consola = console;
window.consola = consola.create({
    level: 'Trace'
});
window.consola = consola;

export const initPlugins = (vueInstance) => {
    vueInstance.use(PortalVue);
    vueInstance.use(wrapPlugin(commands));
    vueInstance.use(wrapPlugin(constants));
    vueInstance.use(wrapPlugin(events));
    vueInstance.directive(directiveMove.name, directiveMove.options);
};
