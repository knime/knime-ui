import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import { mockVuexStore } from '~/test/unit/test-utils';

import * as $shapes from '~/style/shapes';

import NodeNameEditor from '~/components/workflow/NodeNameEditor.vue';
import NodeNameTextarea from '~/components/workflow/NodeNameTextarea.vue';
import NodeNameEditorActionBar from '~/components/workflow/NodeNameEditorActionBar.vue';

describe('NodeNameEditor', () => {
    const propsData = {
        value: 'test',
        nodePosition: { x: 15, y: 13 },
        nodeId: 'root:1'
    };

    let wrapper, storeConfig;

    const doShallowMount = () => {
        storeConfig = {
            canvas: {
                getters: {
                    viewBox: () => ({ left: 0, top: 0 })
                }
            }
        };
        const $store = mockVuexStore(storeConfig);
        const wrapper = shallowMount(NodeNameEditor, {
            propsData,
            mocks: { $shapes, $store }
        });

        return wrapper;
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = doShallowMount();
    });

    it('should render the ActionBar and the Textarea', () => {
        expect(wrapper.findComponent(NodeNameTextarea).exists()).toBe(true);
        expect(wrapper.findComponent(NodeNameEditorActionBar).exists()).toBe(true);
    });


    describe('blocks events to canvas', () => {
        const mockStopPropagation = jest.fn();
        const mockPreventDefault = jest.fn();

        beforeAll(() => {
            MouseEvent.prototype.stopPropagation = mockStopPropagation;
            MouseEvent.prototype.preventDefault = mockPreventDefault;
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should block click events', () => {
            const rect = wrapper.find('rect');

            rect.trigger('click');

            expect(mockStopPropagation).toHaveBeenCalled();
            expect(mockPreventDefault).toHaveBeenCalled();
        });

        it('should block contextmenu events', () => {
            const rect = wrapper.find('rect');

            rect.trigger('contextmenu');

            expect(mockStopPropagation).toHaveBeenCalled();
            expect(mockPreventDefault).toHaveBeenCalled();
        });
    });

    describe('Action bar', () => {
        it('should be positioned based on the relevant prop', () => {
            const actionBar = wrapper.findComponent(NodeNameEditorActionBar);
            const expectedPosition = 'translate(31,-6)';

            expect(actionBar.attributes('transform')).toBe(expectedPosition);
        });

        it('should emit save when clicking the save button', () => {
            wrapper.findComponent(NodeNameTextarea).vm.$emit('input', 'new value');
            wrapper.findComponent(NodeNameEditorActionBar).vm.$emit('save');

            expect(wrapper.emitted('save')).toBeDefined();
        });

        it('should emit a cancel event when clicking the cancel button', () => {
            wrapper.findComponent(NodeNameEditorActionBar).vm.$emit('cancel');

            expect(wrapper.emitted('cancel')).toBeDefined();
        });
    });

    describe('Handle textarea events', () => {
        it.each([
            'width-change',
            'height-change'
        ])('should forward a (%s) event', (eventName) => {
            const emittedValue = 200;
            wrapper.findComponent(NodeNameTextarea).vm.$emit(eventName, emittedValue);
            expect(wrapper.emitted(eventName)[0][0]).toBe(emittedValue);
        });

        it('should emit a save event', () => {
            wrapper.findComponent(NodeNameTextarea).vm.$emit('input', 'new value');
            wrapper.findComponent(NodeNameTextarea).vm.$emit('save');

            expect(wrapper.emitted('save')).toBeDefined();
        });

        it('should not emit a save event if the name did not change', () => {
            wrapper.findComponent(NodeNameTextarea).vm.$emit('input', propsData.value);
            wrapper.findComponent(NodeNameTextarea).vm.$emit('save');

            expect(wrapper.emitted('save')).toBeUndefined();
        });

        it('should emit a cancel event', () => {
            wrapper.findComponent(NodeNameTextarea).vm.$emit('cancel');
            expect(wrapper.emitted('cancel')).toBeDefined();
        });
    });

    it('should trim content before saving', () => {
        const emittedValue = '   this is the content    ';

        wrapper.findComponent(NodeNameTextarea).vm.$emit('input', emittedValue);
        wrapper.findComponent(NodeNameTextarea).vm.$emit('save');

        expect(wrapper.emitted('save')[0][0]).toEqual(expect.objectContaining({
            newName: emittedValue.trim()
        }));
    });

    it('should not save empty values', () => {
        const emittedValue = '    ';

        wrapper.findComponent(NodeNameTextarea).vm.$emit('input', emittedValue);
        wrapper.findComponent(NodeNameTextarea).vm.$emit('save');

        expect(wrapper.emitted('save')).toBeUndefined();
        expect(wrapper.emitted('cancel')).toBeDefined();
    });

    it('should emit the latest dimensions of the editor when saving', () => {
        const emittedWidth = 200;
        const emittedHeight = 100;
        wrapper.findComponent(NodeNameTextarea).vm.$emit('width-change', emittedWidth);
        wrapper.findComponent(NodeNameTextarea).vm.$emit('height-change', emittedHeight);

        wrapper.findComponent(NodeNameTextarea).vm.$emit('input', 'new value');
        wrapper.findComponent(NodeNameTextarea).vm.$emit('save');

        expect(wrapper.emitted('save')[0][0]).toEqual(expect.objectContaining({
            dimensionsOnClose: { width: emittedWidth, height: emittedHeight }
        }));
    });

    it('should show an error message for invalid characters input', async () => {
        expect(wrapper.find('foreignObject').exists()).toBe(false);
        await wrapper.findComponent(NodeNameTextarea).vm.$emit('invalid-input');
        expect(wrapper.find('foreignObject').exists()).toBe(true);
        expect(wrapper.find('foreignObject').text()).toContain('are not allowed and have been removed.');
    });

    it('hides error message after some time', async () => {
        jest.useFakeTimers();
        expect(wrapper.find('foreignObject').exists()).toBe(false);
        await wrapper.findComponent(NodeNameTextarea).vm.$emit('invalid-input');
        expect(wrapper.find('foreignObject').exists()).toBe(true);
        jest.runAllTimers();
        await wrapper.vm.$nextTick();
        expect(wrapper.find('foreignObject').exists()).toBe(false);
    });

    it('clears active hide error message timer if another inlaid input occurs', async () => {
        window.clearTimeout = jest.fn();
        await wrapper.findComponent(NodeNameTextarea).vm.$emit('invalid-input');
        await wrapper.findComponent(NodeNameTextarea).vm.$emit('invalid-input');
        expect(window.clearTimeout).toBeCalled();
    });

    it('updates value of textarea on value prop change', async () => {
        expect(wrapper.findComponent(NodeNameTextarea).props('value')).toBe('test');
        await wrapper.setProps({ value: 'newValue' });
        expect(wrapper.findComponent(NodeNameTextarea).props('value')).toBe('newValue');
    });
});
