import shortcuts from './shortcuts';
import constants from './constants';
import { directiveMove } from './directive-move';
import events from './events';

import Portal from '@/components/common/Portal.vue';
import PortalTarget from '@/components/common/PortalTarget.vue';

export const initPlugins = (app, store) => {
    const wrapPlugin = (plugin) => ({
        install(app) {
            plugin(app, store);
        }
    });

    app.use(wrapPlugin(shortcuts));
    app.use(wrapPlugin(constants));
    app.use(wrapPlugin(events));
    app.directive(directiveMove.name, directiveMove.options);
    
    app.component('Portal', Portal);
    app.component('PortalTarget', PortalTarget);
};
