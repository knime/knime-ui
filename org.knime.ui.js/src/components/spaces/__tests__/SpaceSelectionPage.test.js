import Vuex from 'vuex';
import { mockVuexStore } from '@/test/test-utils';
import { createLocalVue, mount } from '@vue/test-utils';

import * as spacesStore from '@/store/spaces';

import { fetchAllSpaceProviders } from '@api';
import SpaceSelectionPage from '../SpaceSelectionPage.vue';
import SpaceCard from '../SpaceCard.vue';
import { APP_ROUTES } from '@/router';

const mockSpaceProviders = {
    local: {
        id: 'local',
        connected: true,
        connectionMode: 'AUTOMATIC',
        name: 'Local Space'
    }
};

jest.mock('@api');

describe('SpaceSelectionPage.vue', () => {
    const doMount = ({ mockProvidersResponse = mockSpaceProviders } = {}) => {
        fetchAllSpaceProviders.mockResolvedValue(mockProvidersResponse);
        
        const $store = mockVuexStore({
            spaces: spacesStore
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

    it('should fetch space providers on created', () => {
        const { dispatchSpy } = doMount();
        
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/fetchAllSpaceProviders');
    });
    
    it('should render all space providers', async () => {
        const { wrapper } = doMount();

        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(wrapper.findAll('.space-provider').length).toBe(1);
    });

    it('should handle login for spaces that require authentication', async () => {
        const { wrapper, dispatchSpy } = doMount({
            mockProvidersResponse: {
                hub1: {
                    id: 'hub1',
                    connected: false,
                    connectionMode: 'AUTHENTICATED',
                    name: 'Hub 1'
                }
            }
        });

        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        const signInButton = wrapper.find('.sign-in');
        expect(signInButton.exists()).toBe(true);

        signInButton.trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/connectProvider', { spaceProviderId: 'hub1' });
    });
    
    it('should handle logout for spaces that require authentication', async () => {
        const { wrapper, dispatchSpy } = doMount({
            mockProvidersResponse: {
                hub1: {
                    id: 'hub1',
                    connected: true,
                    connectionMode: 'AUTHENTICATED',
                    name: 'Hub 1'
                }
            }
        });

        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        const signInButton = wrapper.find('.logout');
        expect(signInButton.exists()).toBe(true);

        signInButton.trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/disconnectProvider', { spaceProviderId: 'hub1' });
    });

    it('should navigate to space browsing page', async () => {
        const { wrapper, $store, $router } = doMount({
            mockProvidersResponse: {
                hub1: {
                    id: 'hub1',
                    connected: true,
                    connectionMode: 'AUTHENTICATED',
                    name: 'Hub 1'
                }
            }
        });

        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        const dummySpace = { id: 'dummy-id', name: 'Dummy Space', private: true, description: '' };

        $store.state.spaces.spaceProviders.hub1.spaces = [dummySpace];
        await wrapper.vm.$nextTick();

        wrapper.findComponent(SpaceCard).vm.$emit('click', dummySpace);

        expect($store.state.spaces.activeSpaceProvider.id).toEqual('hub1');
        expect($store.state.spaces.activeSpace.spaceId).toEqual(dummySpace.id);
        expect($store.state.spaces.activeSpaceInfo).toEqual({ local: false, private: true, name: 'Dummy Space' });
        expect($router.push).toHaveBeenCalledWith({ name: APP_ROUTES.SpaceBrowsingPage });
    });
});
