import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import NodeLabelEditor from '../NodeLabelEditor.vue';
import NodeLabelTextarea from '../NodeLabelTextarea.vue';
import NodeEditorActionBar from '../../common/NodeEditorActionBar.vue';

describe('NodeLabelEditor', () => {
    let wrapper, storeConfig, propsData;

    const doShallowMount = () => {
        propsData = {
            value: 'test',
            nodePosition: { x: 15, y: 13 },
            nodeId: 'root:1',
            kind: 'node'
        };

        storeConfig = {
            canvas: {
                getters: {
                    viewBox: () => ({ left: 0, top: 0 })
                }
            }
        };
        const $store = mockVuexStore(storeConfig);
        const wrapper = shallowMount(NodeLabelEditor, {
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
        expect(wrapper.findComponent(NodeLabelTextarea).exists()).toBe(true);
        expect(wrapper.findComponent(NodeEditorActionBar).exists()).toBe(true);
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
            const actionBar = wrapper.findComponent(NodeEditorActionBar);
            const expectedPosition = 'translate(31,61)';

            expect(actionBar.attributes('transform')).toBe(expectedPosition);
        });

        it('should be positioned differently for metanode', async () => {
            await wrapper.setProps({ kind: 'metanode' });
            const actionBar = wrapper.findComponent(NodeEditorActionBar);
            const expectedPosition = 'translate(31,41)';

            expect(actionBar.attributes('transform')).toBe(expectedPosition);
        });

        it('should emit save when clicking the save button', () => {
            wrapper.findComponent(NodeLabelTextarea).vm.$emit('input', 'new value');
            wrapper.findComponent(NodeEditorActionBar).vm.$emit('save');

            expect(wrapper.emitted('save')).toBeDefined();
        });

        it('should emit a cancel event when clicking the cancel button', () => {
            wrapper.findComponent(NodeEditorActionBar).vm.$emit('cancel');

            expect(wrapper.emitted('cancel')).toBeDefined();
        });
    });

    describe('Handle textarea events', () => {
        it('should emit a save event', () => {
            wrapper.findComponent(NodeLabelTextarea).vm.$emit('input', 'new value');
            wrapper.findComponent(NodeLabelTextarea).vm.$emit('save');

            expect(wrapper.emitted('save')).toBeDefined();
        });

        it('should not emit a save event if the label did not change', () => {
            wrapper.findComponent(NodeLabelTextarea).vm.$emit('input', propsData.value);
            wrapper.findComponent(NodeLabelTextarea).vm.$emit('save');

            expect(wrapper.emitted('save')).toBeUndefined();
        });

        it('should emit a cancel event', () => {
            wrapper.findComponent(NodeLabelTextarea).vm.$emit('cancel');
            expect(wrapper.emitted('cancel')).toBeDefined();
        });
    });

    it('should trim content before saving', () => {
        const emittedValue = '   this is the content    ';

        wrapper.findComponent(NodeLabelTextarea).vm.$emit('input', emittedValue);
        wrapper.findComponent(NodeLabelTextarea).vm.$emit('save');

        expect(wrapper.emitted('save')[0][0]).toEqual(expect.objectContaining({
            newLabel: emittedValue.trim()
        }));
    });

    it('should not save empty values', () => {
        const emittedValue = '    ';

        wrapper.findComponent(NodeLabelTextarea).vm.$emit('input', emittedValue);
        wrapper.findComponent(NodeLabelTextarea).vm.$emit('save');

        expect(wrapper.emitted('save')).toBeUndefined();
        expect(wrapper.emitted('cancel')).toBeDefined();
    });

    it('updates value of textarea on value prop change', async () => {
        expect(wrapper.findComponent(NodeLabelTextarea).props('value')).toBe('test');
        await wrapper.setProps({ value: 'newValue' });
        expect(wrapper.findComponent(NodeLabelTextarea).props('value')).toBe('newValue');
    });
});
