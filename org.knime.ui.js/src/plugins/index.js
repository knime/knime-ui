import PortalVue from 'portal-vue';

import shortcuts from './shortcuts';
import constants from './constants';
import { directiveMove } from './directive-move';
import events from './events';
import featuresFlags from './feature-flags';

export const initPlugins = (vueInstance, store) => {
    const wrapPlugin = (plugin) => ({
        install(Vue) {
            let context = { store };
    
            let inject = (name, content) => {
                Vue.prototype[`$${name}`] = content;
            };
    
            plugin(context, inject);
        }
    });

    vueInstance.use(PortalVue);
    vueInstance.use(wrapPlugin(shortcuts));
    vueInstance.use(wrapPlugin(constants));
    vueInstance.use(wrapPlugin(events));
    vueInstance.use(wrapPlugin(featuresFlags));
    vueInstance.directive(directiveMove.name, directiveMove.options);
};
