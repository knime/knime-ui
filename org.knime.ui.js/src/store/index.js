import { createStore } from 'vuex';

import * as application from './application';
import * as canvas from './canvas';
import * as nodeRepository from './nodeRepository';
import * as panel from './panel';
import * as selection from './selection';
import * as workflow from './workflow';
import * as api from './uiExtApi';


// eslint-disable-next-line arrow-body-style
export const initStore = () => {
    return createStore({
        modules: {
            application: { namespaced: true, ...application },
            canvas: { namespaced: true, ...canvas },
            nodeRepository: { namespaced: true, ...nodeRepository },
            panel: { namespaced: true, ...panel },
            selection: { namespaced: true, ...selection },
            workflow: { namespaced: true, ...workflow },
            // TODO: NXT-1217 Remove this unnecessary store once the issue in the ticket
            // can be solved in a better way
            api: { namespaced: true, ...api }
        }
    });
};
