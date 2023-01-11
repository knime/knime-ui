import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import PageHeader from '@/components/common/PageHeader.vue';
import UpdateBanner from '@/components/common/UpdateBanner.vue';
import SpaceExplorer from '../SpaceExplorer.vue';
import SpaceBrowsingPage from '../SpaceBrowsingPage.vue';

describe('SpaceBrowsingPage', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const doShallowMount = () => {
        const storeConfig = {
            application: {
                state: {
                    availableUpdates: {
                        newReleases: [
                            {
                                isUpdatePossible: true,
                                name: 'KNIME Analytics Platform 5.0',
                                shortName: '5.0'
                            }
                        ],
                        bugfixes: ['Update1', 'Update2']
                    }
                }
            }
        };

        const $store = mockVuexStore(storeConfig);
        const wrapper = shallowMount(SpaceBrowsingPage, {
            mocks: { $store }
        });
        return { wrapper, $store };
    };

    it('renders the components', () => {
        const { wrapper } = doShallowMount();

        expect(wrapper.findComponent(PageHeader).exists()).toBe(true);
        expect(wrapper.findComponent(SpaceExplorer).exists()).toBe(true);
        expect(wrapper.findComponent(UpdateBanner).exists()).toBe(true);
    });

    it('does not show banner if there are no updates available', async () => {
        const { wrapper, $store } = doShallowMount();
        $store.state.application.availableUpdates = null;
        await Vue.nextTick();
        
        expect(wrapper.findComponent(UpdateBanner).exists()).toBe(false);
    });
});
