import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import * as nodeTemplateStoreConfig from '~/store/nodeTemplates';

describe('node template store', () => {

    let store, localVue;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        store = mockVuexStore({
            nodeTemplates: nodeTemplateStoreConfig
        });
    });

    it('creates an empty store', () => {
        expect(Object.keys(store.state.nodeTemplates)).toHaveLength(0);
    });

    describe('mutation', () => {
        it('adds templates', () => {
            store.commit('nodeTemplates/add', { templateId: 'bla', templateData: { foo: 'bar' } });

            expect(store.state.nodeTemplates.bla).toStrictEqual({ foo: 'bar' });
        });
    });
});
