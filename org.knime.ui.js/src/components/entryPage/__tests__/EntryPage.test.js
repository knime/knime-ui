import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import SpaceExplorer from '@/components/spaceExplorer/SpaceExplorer.vue';
import EntryPage from '../EntryPage.vue';

describe('EntryPage', () => {
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
        const wrapper = shallowMount(EntryPage, {
            mocks: { $store }
        });
        return { wrapper, $store };
    };

    it('renders renders the SpaceExplorer', () => {
        const { wrapper } = doShallowMount();

        expect(wrapper.findComponent(SpaceExplorer).exists()).toBe(true);
    });

    it('shows banner with right text if release update is available', () => {
        const { wrapper } = doShallowMount();
        const updateText = wrapper.find('.text');

        expect(updateText.text()).toBe('Get the latest features and enhancements! Update now to 5.0');
    });

    it('shows banner with right text if there are bug fixes but no release available', async () => {
        const { wrapper, $store } = doShallowMount();
        $store.state.application.availableUpdates = {
            newReleases: undefined,
            bugfixes: ['Update1', 'Update2']
        };
        await Vue.nextTick();
        const updateText = wrapper.find('.text');

        expect(updateText.text()).toBe('There are updates for 2 extensions available.');
    });

    it('shows banner with right text if there is one bug fixe but no release available', async () => {
        const { wrapper, $store } = doShallowMount();
        $store.state.application.availableUpdates = {
            newReleases: undefined,
            bugfixes: ['Update1']
        };
        await Vue.nextTick();
        const updateText = wrapper.find('.text');

        expect(updateText.text()).toBe('There is an update for 1 extension available.');
    });

    it('does not show banner if there are no updates available', async () => {
        const { wrapper, $store } = doShallowMount();
        $store.state.application.availableUpdates = null;
        await Vue.nextTick();
        const footer = wrapper.find('.footer-wrapper');

        expect(footer.exists()).toBe(false);
    });
});
