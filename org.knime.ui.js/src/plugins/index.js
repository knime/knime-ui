import shortcuts from './shortcuts';
import constants from './constants';
import { directiveMove } from './directive-move';
import events from './events';
import eventBus from './event-bus';
import featureFlags from './feature-flags';

import Portal from '@/components/common/Portal.vue';
import PortalTarget from '@/components/common/PortalTarget.vue';

export const initPlugins = ({ app, store, router }) => {
    const wrapPlugin = (plugin) => ({
        install(app) {
            plugin({ app, $store: store, $router: router });
        }
    });

    app.use(wrapPlugin(shortcuts));
    app.use(wrapPlugin(constants));
    app.use(wrapPlugin(events));
    app.use(wrapPlugin(eventBus));
    app.use(wrapPlugin(featureFlags));
    app.directive(directiveMove.name, directiveMove.options);
    
    app.component('Portal', Portal);
    app.component('PortalTarget', PortalTarget);
};
