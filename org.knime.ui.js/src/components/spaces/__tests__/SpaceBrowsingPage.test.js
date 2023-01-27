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

    const doMount = ({
        activeSpaceInfoMock = jest.fn().mockReturnValue({
            local: true,
            private: false,
            name: 'Local space'
        }),
        clearSpaceBrowserStateMock = jest.fn(),
        spaceBrowser = {},
        saveSpaceBrowserStateMock = jest.fn(),
        loadSpaceBrowserStateMock = jest.fn()
    } = {}) => {
        const $store = mockVuexStore({
            spaces: {
                state: {
                    spaceBrowser
                },
                mutations: {
                    clearSpaceBrowserState: clearSpaceBrowserStateMock
                },
                getters: {
                    activeSpaceInfo: activeSpaceInfoMock
                },
                actions: {
                    saveSpaceBrowserState: saveSpaceBrowserStateMock,
                    loadSpaceBrowserState: loadSpaceBrowserStateMock
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
        expect(title).toBe('Your local space');
    });

    it('renders correct information for private space', async () => {
        const { wrapper } = doMount({
            activeSpaceInfoMock: jest.fn().mockReturnValue({
                local: false,
                private: true,
                name: 'My private space'
            })
        });
        await wrapper.vm.$nextTick();

        const subtitle = wrapper.find('.subtitle').text();
        const title = wrapper.find('.title').text();
        expect(subtitle).toBe('Private space');
        expect(title).toBe('My private space');
    });

    it('renders correct information for public space', async () => {
        const { wrapper } = doMount({
            activeSpaceInfoMock: jest.fn().mockReturnValue({
                local: false,
                private: false,
                name: 'My public space'
            })
        });
        await wrapper.vm.$nextTick();

        const subtitle = wrapper.find('.subtitle').text();
        const title = wrapper.find('.title').text();
        expect(subtitle).toBe('Public space');
        expect(title).toBe('My public space');
    });

    it('routes back to space selection page when back button is clicked and clears state', async () => {
        const clearSpaceBrowserStateMock = jest.fn();
        const { wrapper } = doMount({ clearSpaceBrowserStateMock });
        await wrapper.findComponent(ArrowLeftIcon).vm.$emit('click');

        expect(clearSpaceBrowserStateMock).toHaveBeenCalled();
        expect($router.push).toHaveBeenCalledWith({
            name: APP_ROUTES.EntryPage.SpaceSelectionPage
        });
    });

    it('renders buttons in toolbar for local space', () => {
        const { wrapper } = doMount();

        const buttons = wrapper.find('.toolbar-buttons');
        expect(buttons.exists()).toBe(true);
    });

    it('does not render buttons in toolbar if the space is not local', async () => {
        const { wrapper } = doMount({
            activeSpaceInfoMock: jest.fn().mockReturnValue({
                local: false,
                private: false,
                name: 'My public space'
            })
        });
        await wrapper.vm.$nextTick();

        const buttons = wrapper.find('.toolbar-buttons');
        expect(buttons.exists()).toBe(false);
    });

    describe('global spaceBrowser state', () => {
        it('load the spaceBrowser state on mount', () => {
            const loadSpaceBrowserStateMock = jest.fn();
            doMount({
                loadSpaceBrowserStateMock,
                spaceBrowser: {
                    spaceId: 'spaceId',
                    spaceProviderId: 'spaceProvId',
                    itemId: 'someItem'
                }
            });
            expect(loadSpaceBrowserStateMock).toHaveBeenCalled();
        });

        it('does not load spaceBrowser state if its falsy', () => {
            const loadSpaceBrowserStateMock = jest.fn();
            doMount({
                loadSpaceBrowserStateMock,
                spaceBrowser: {}
            });
            expect(loadSpaceBrowserStateMock).toHaveBeenCalledTimes(0);
        });

        it('saves the spaceBrowser state on item change', () => {
            const saveSpaceBrowserStateMock = jest.fn();
            const { wrapper } = doMount({ saveSpaceBrowserStateMock });

            wrapper.findComponent(SpaceExplorer).vm.$emit('item-changed', 'someNewItemId');

            expect(saveSpaceBrowserStateMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                itemId: 'someNewItemId'
            }));
        });
    });
});

