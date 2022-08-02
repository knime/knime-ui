import PortalVue from 'portal-vue';

import commands from './commands';
import constants from './constants';
import { directiveMove } from './directive-move';
import events from './events';

import store from '../store';
import { initLogger } from './logger';

const wrapPlugin = plugin => ({
    install(Vue) {
        let context = { store };

        let inject = (name, content) => {
            Vue.prototype[`$${name}`] = content;
        };

        plugin(context, inject);
    }
});

export const initPlugins = (vueInstance) => {
    vueInstance.use(PortalVue);
    vueInstance.use(wrapPlugin(commands));
    vueInstance.use(wrapPlugin(constants));
    vueInstance.use(wrapPlugin(events));
    vueInstance.directive(directiveMove.name, directiveMove.options);
    initLogger();
};
