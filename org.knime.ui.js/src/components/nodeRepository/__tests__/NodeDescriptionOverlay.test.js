import Vuex from 'vuex';
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import NodeDescriptionOverlay from '../NodeDescriptionOverlay.vue';
import NodeDescription from '../NodeDescription.vue';

import { escapeStack as escapeStackMock } from '@/mixins/escapeStack';
jest.mock('@/mixins/escapeStack', () => {
    function escapeStack({ onEscape }) { // eslint-disable-line func-style
        escapeStack.onEscape = onEscape;
        return { /* empty mixin */ };
    }
    return { escapeStack };
});

describe('NodeDescription', () => {
    let mocks, doMount, wrapper, storeConfig, $store, closeDescriptionPanelMock, propsData;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        closeDescriptionPanelMock = jest.fn();
        const getNodeDescription = () => ({
            id: 1,
            description: 'This is a node.',
            links: [{
                text: 'link',
                url: 'www.link.com'
            }]
        });

        storeConfig = {
            nodeRepository: {
                actions: {
                    getNodeDescription,
                    closeDescriptionPanel: closeDescriptionPanelMock
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        propsData = {
            selectedNode: {
                id: 1,
                name: 'Test',
                nodeFactory: {
                    className: 'some.class.name',
                    settings: ''
                }
            }
        };
        doMount = () => {
            wrapper = mount(NodeDescriptionOverlay, { propsData, mocks });
        };
    });

    it('renders all components', () => {
        doMount();
        expect(wrapper.findComponent(NodeDescriptionOverlay).exists()).toBe(true);
        expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
        expect(wrapper.findComponent(NodeDescription).props('selectedNode').id).toBe(1);
    });

    it('closes the panel when button is clicked', () => {
        doMount();
        const button = wrapper.find('button');
        button.trigger('click');
        expect(closeDescriptionPanelMock).toHaveBeenCalled();
    });

    it('closes on escape', () => {
        // adds event handler on mount
        doMount();
        escapeStackMock.onEscape.call(wrapper.vm);

        expect(closeDescriptionPanelMock).toHaveBeenCalledTimes(1);
    });
});
