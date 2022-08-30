/* istanbul ignore file */
import Vuex from 'vuex';

import * as application from './application';
import * as canvas from './canvas';
import * as nodeRepository from './nodeRepository';
import * as panel from './panel';
import * as selection from './selection';
import * as workflow from './workflow';


// eslint-disable-next-line arrow-body-style
export const initStore = Vue => {
    Vue.use(Vuex);
    
    return new Vuex.Store({
        modules: {
            application: { namespaced: true, ...application },
            canvas: { namespaced: true, ...canvas },
            nodeRepository: { namespaced: true, ...nodeRepository },
            panel: { namespaced: true, ...panel },
            selection: { namespaced: true, ...selection },
            workflow: { namespaced: true, ...workflow }
        }
    });
};
