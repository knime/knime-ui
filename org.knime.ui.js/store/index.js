/* istanbul ignore file */
import Vue from 'vue';
import Vuex from 'vuex';

import * as application from './application';
import * as canvas from './canvas';
import * as nodeRepository from './nodeRepository';
import * as panel from './panel';
import * as selection from './selection';
import * as workflow from './workflow';

Vue.use(Vuex);

export default new Vuex.Store({
    modules: {
        application: { namespaced: true, ...application },
        canvas: { namespaced: true, ...canvas },
        nodeRepository: { namespaced: true, ...nodeRepository },
        panel: { namespaced: true, ...panel },
        selection: { namespaced: true, ...selection },
        workflow: { namespaced: true, ...workflow }
    }
});
