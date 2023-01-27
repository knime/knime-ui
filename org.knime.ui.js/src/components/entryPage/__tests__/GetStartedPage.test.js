import Vuex from 'vuex';
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import GetStartedPage from '@/components/entryPage/GetStartedPage.vue';
import Card from '@/components/common/Card.vue';

describe('GettingStartedPage.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const $router = {
        push: jest.fn()
    };

    const doMount = ({
        openWorkflowMock = jest.fn()
    } = {}) => {
        const $store = mockVuexStore({
            application: {
                state: {
                    exampleProjects: [{
                        name: 'Test',
                        svg: 'svg',
                        origin: {
                            itemId: 'item',
                            spaceId: 'space',
                            providerId: 'provider'
                        }
                    }, {
                        name: 'Test 2',
                        svg: 'svg2',
                        origin: {
                            itemId: 'item2',
                            spaceId: 'space2',
                            providerId: 'provider2'
                        }
                    }]
                }
            },
            spaces: {
                actions: {
                    openWorkflow: openWorkflowMock
                }
            }
        });

        // stubs
        const SpaceSelectionPage = {
            template: '<div />'
        };

        const wrapper = mount(GetStartedPage, {
            mocks: { $store, $router },
            stubs: { SpaceSelectionPage }
        });
        return { wrapper, $store, SpaceSelectionPage };
    };

    it('renders the components', () => {
        const { wrapper, SpaceSelectionPage } = doMount();
        expect(wrapper.findComponent(Card).exists()).toBe(true);
        expect(wrapper.findComponent(SpaceSelectionPage).exists()).toBe(true);
    });

    it('click opens workflow', async () => {
        const openWorkflowMock = jest.fn();
        const { wrapper } = doMount({ openWorkflowMock });
        expect(wrapper.findComponent(Card).exists()).toBe(true);

        const cards = wrapper.findAll('.card');
        expect(cards.length).toBe(2);

        cards.at(0).trigger('click');
        await wrapper.vm.$nextTick();
        expect(openWorkflowMock).toBeCalledWith(expect.anything(), expect.objectContaining({
            spaceId: 'space',
            spaceProviderId: 'provider',
            workflowItemId: 'item'
        }));
    });
});

