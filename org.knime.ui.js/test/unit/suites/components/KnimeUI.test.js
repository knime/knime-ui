import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import KnimeUI from '~/components/KnimeUI';

describe('KnimeUI.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, doShallowMount, initState;

    beforeEach(() => {
        initState = jest.fn();

        doShallowMount = async () => {
            store = mockVuexStore({
                application: {
                    actions: {
                        initState
                    }
                }
            });

            await shallowMountWithAsyncData(
                KnimeUI,
                { store },
                {
                    mocks: { $store: store }
                }
            );
        };
    });

    it('initiates', async () => {
        await doShallowMount();

        expect(initState).toHaveBeenCalled();
    });
});
