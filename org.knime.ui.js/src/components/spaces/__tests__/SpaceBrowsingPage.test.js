import Vuex from 'vuex';
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import ArrowLeftIcon from 'webapps-common/ui/assets/img/icons/arrow-left.svg';
import { APP_ROUTES } from '@/router';
import PageHeader from '@/components/common/PageHeader.vue';
import SpaceExplorer from '../SpaceExplorer.vue';
import SpaceBrowsingPage from '../SpaceBrowsingPage.vue';

describe('SpaceBrowsingPage', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const $router = {
        push: jest.fn()
    };

    const doMount = () => {
        const $store = mockVuexStore({
            spaces: {
                state: {
                    activeSpaceInfo: {
                        local: true,
                        private: false,
                        name: ''
                    }
                }
            }
        });

        const wrapper = mount(SpaceBrowsingPage, {
            mocks: { $store, $router }
        });
        return { wrapper, $store };
    };

    it('renders the components', () => {
        const { wrapper } = doMount();

        expect(wrapper.findComponent(PageHeader).exists()).toBe(true);
        expect(wrapper.findComponent(SpaceExplorer).exists()).toBe(true);
        expect(wrapper.findComponent(ArrowLeftIcon).exists()).toBe(true);
    });

    it('renders correct information for local space', () => {
        const { wrapper } = doMount();

        const subtitle = wrapper.find('.subtitle').text();
        const title = wrapper.find('.title').text();
        expect(subtitle).toBe('Local space');
        expect(title).toBe('Your Local Space');
    });

    it('renders correct information for private space', async () => {
        const { wrapper, $store } = doMount();
        $store.state.spaces.activeSpaceInfo = {
            local: false,
            private: true,
            name: 'My private space'
        };
        await wrapper.vm.$nextTick();

        const subtitle = wrapper.find('.subtitle').text();
        const title = wrapper.find('.title').text();
        expect(subtitle).toBe('Private space');
        expect(title).toBe('My private space');
    });

    it('renders correct information for public space', async () => {
        const { wrapper, $store } = doMount();
        $store.state.spaces.activeSpaceInfo = {
            local: false,
            private: false,
            name: 'My public space'
        };
        await wrapper.vm.$nextTick();

        const subtitle = wrapper.find('.subtitle').text();
        const title = wrapper.find('.title').text();
        expect(subtitle).toBe('Public space');
        expect(title).toBe('My public space');
    });

    it('routes back to space selection page when back button is clicked', async () => {
        const { wrapper } = doMount();
        await wrapper.findComponent(ArrowLeftIcon).vm.$emit('click');

        expect($router.push).toHaveBeenCalledWith({
            name: APP_ROUTES.EntryPage.SpaceSelectionPage
        });
    });
});

