import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import KnimeUI from '~/components/KnimeUI';

describe('KnimeUI.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, doShallowMount, initState, wrapper;

    beforeEach(() => {
        initState = jest.fn();
        document.fonts = {
            load: jest.fn()
        };

        doShallowMount = async () => {
            store = mockVuexStore({
                workflows: {
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
        document.fonts.load.mockResolvedValue('dummy');

        await doShallowMount();

        expect(initState).toHaveBeenCalled();
        expect(document.fonts.load).toHaveBeenCalledTimes(3);
    });

});
