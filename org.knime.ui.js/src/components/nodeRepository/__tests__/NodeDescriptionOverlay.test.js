import { mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import NodeDescriptionOverlay from '../NodeDescriptionOverlay.vue';
import NodeDescription from '../NodeDescription.vue';

import { escapeStack as escapeStackMock } from '@/mixins/escapeStack';
vi.mock('@/mixins/escapeStack', () => {
    function escapeStack({ onEscape }) { // eslint-disable-line func-style
        escapeStack.onEscape = onEscape;
        return { /* empty mixin */ };
    }
    return { escapeStack };
});

describe('NodeDescription', () => {
    const doMount = () => {
        const getNodeDescription = () => ({
            id: 1,
            description: 'This is a node.',
            links: [{
                text: 'link',
                url: 'www.link.com'
            }]
        });

        const $store = mockVuexStore({
            nodeRepository: {
                actions: {
                    getNodeDescription,
                    closeDescriptionPanel: () => {}
                }
            }
        });

        const dispatchSpy = vi.spyOn($store, 'dispatch');

        const props = {
            selectedNode: {
                id: 1,
                name: 'Test',
                nodeFactory: {
                    className: 'some.class.name',
                    settings: ''
                }
            }
        };
        const wrapper = mount(NodeDescriptionOverlay, { props, global: { plugins: [$store] } });

        return { wrapper, dispatchSpy };
    };

    it('renders all components', () => {
        const { wrapper } = doMount();
        expect(wrapper.findComponent(NodeDescriptionOverlay).exists()).toBe(true);
        expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
        expect(wrapper.findComponent(NodeDescription).props('selectedNode').id).toBe(1);
    });

    it('closes the panel when button is clicked', () => {
        const { wrapper, dispatchSpy } = doMount();
        const button = wrapper.find('button');
        button.trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/closeDescriptionPanel', expect.anything());
    });

    it('closes on escape', () => {
        // adds event handler on mount
        const { wrapper, dispatchSpy } = doMount();
        dispatchSpy.mockClear();
        escapeStackMock.onEscape.call(wrapper.vm);

        expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/closeDescriptionPanel', undefined);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });
});
