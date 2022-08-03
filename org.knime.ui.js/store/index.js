/* istanbul ignore file */
import Vue from 'vue';
import Vuex from 'vuex';

import * as application from './application.js';
import * as canvas from './canvas.js';
import * as nodeRepository from './nodeRepository.js';
import * as panel from './panel.js';
import * as selection from './selection.js';
import * as workflow from './workflow.js';

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
