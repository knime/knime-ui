import Vuex from 'vuex';
import { mockVuexStore } from '@/test/test-utils';
import { createLocalVue, mount } from '@vue/test-utils';

import SpaceSelectionPage from '../SpaceSelectionPage.vue';
import SpaceCard from '../SpaceCard.vue';
import { APP_ROUTES } from '@/router';

jest.mock('@api');

describe('SpaceSelectionPage.vue', () => {
    const doMount = ({ spacesStoreOverride = null } = {}) => {
        const $store = mockVuexStore({
            spaces: {
                state: {
                    spaceProviders: {
                        local: {
                            id: 'local',
                            connected: true,
                            connectionMode: 'AUTOMATIC',
                            name: 'Local Space'
                        }
                    },
                    spaceBrowser: {
                        spaceId: 'local'
                    }
                }
            }
        });

        const dispatchSpy = jest.spyOn($store, 'dispatch');

        const mockRouter = { push: jest.fn() };

        const wrapper = mount(SpaceSelectionPage, {
            mocks: { $store, $router: mockRouter }
        });

        return { wrapper, $store, dispatchSpy, $router: mockRouter };
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });


    it('should redirect to browsing page if it was previously open', () => {
        const { $router } = doMount();

        expect($router.push).toHaveBeenCalledWith({ name: APP_ROUTES.SpaceBrowsingPage });
    });

    it('should render all space providers', () => {
        const { wrapper } = doMount();

        expect(wrapper.findAll('.space-provider').length).toBe(1);
    });

    it('should handle login for spaces that require authentication', async () => {
        const { wrapper, dispatchSpy, $store } = doMount();
        $store.state.spaces.spaceProviders = {
            hub1: {
                id: 'hub1',
                connected: false,
                connectionMode: 'AUTHENTICATED',
                name: 'Hub 1'
            }
        };

        await wrapper.vm.$nextTick();

        const signInButton = wrapper.find('.sign-in');
        expect(signInButton.exists()).toBe(true);

        signInButton.trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/connectProvider', { spaceProviderId: 'hub1' });
    });

    it('should handle logout for spaces that require authentication', async () => {
        const { wrapper, dispatchSpy, $store } = doMount();
        $store.state.spaces.spaceProviders = {
            hub1: {
                id: 'hub1',
                connected: true,
                connectionMode: 'AUTHENTICATED',
                name: 'Hub 1'
            }
        };

        await wrapper.vm.$nextTick();

        const signInButton = wrapper.find('.logout');
        expect(signInButton.exists()).toBe(true);

        signInButton.trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/disconnectProvider', { spaceProviderId: 'hub1' });
    });

    it('should navigate to space browsing page', async () => {
        const { wrapper, $store, $router } = doMount();
        const dummySpace = { id: 'dummy-id', name: 'Dummy Space', private: true, description: '' };
        $store.state.spaces.spaceProviders = {
            hub1: {
                id: 'hub1',
                connected: true,
                connectionMode: 'AUTHENTICATED',
                name: 'Hub 1',
                spaces: [dummySpace]
            }
        };
        await wrapper.vm.$nextTick();

        expect(wrapper.findComponent(SpaceCard).exists()).toBe(true);

        wrapper.findComponent(SpaceCard).vm.$emit('click', dummySpace);

        await wrapper.vm.$nextTick();
        expect($router.push).toHaveBeenCalledWith({ name: APP_ROUTES.SpaceBrowsingPage });
    });
});
