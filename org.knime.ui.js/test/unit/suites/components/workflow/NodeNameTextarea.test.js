import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';

import NodeNameTextarea from '~/components/workflow/NodeNameTextarea';

describe('NodeNameTextarea', () => {
    const mockSizeChangeFn = jest.fn();

    const doShallowMount = (opts = { propsData: { value: '' } }) => {
        const wrapper = shallowMount(NodeNameTextarea, {
            ...opts,
            mocks: {
                $shapes,
                mockSizeChangeFn
            },
            stubs: {
                NodeNameText: {
                    template: `<div id="node-name-stub"><slot :on="{ sizeChange: mockSizeChangeFn }"></slot></div>`
                }
            }
        });

        return wrapper;
    };

    it('render with given value as text', () => {
        const value = 'test';
        const wrapper = doShallowMount({ propsData: { value } });
        expect(wrapper.find('textarea').element.value).toBe(value);
    });

    it('should call the size change callback provided by the slot of the NodeNameText', () => {
        const wrapper = doShallowMount();

        wrapper.find('textarea').trigger('input');

        expect(mockSizeChangeFn).toHaveBeenCalled();
    });

    it('should emit "save" on enter', () => {
        const wrapper = doShallowMount();

        wrapper.find('textarea').trigger('keydown.enter');

        expect(wrapper.emitted('save')).toBeDefined();
    });

    it('should emit "close" on escape', () => {
        const wrapper = doShallowMount();

        wrapper.find('textarea').trigger('keydown.esc');

        expect(wrapper.emitted('close')).toBeDefined();
    });

    it.each([
        'width-change',
        'height-change'
    ])('should emit a (%s) event', (eventName) => {
        const wrapper = doShallowMount();

        const emittedValue = 100;
        wrapper.find('#node-name-stub').vm.$emit(eventName, emittedValue);

        expect(wrapper.emitted(eventName)[0][0]).toBe(emittedValue);
    });

    it('should emit an input event when text changes', () => {
        const wrapper = doShallowMount();

        const emittedValue = 'mock text';

        wrapper.find('textarea').setValue(emittedValue);
        wrapper.find('textarea').trigger('input');

        expect(wrapper.emitted('input')[0][0]).toBe(emittedValue);
    });

    it('should focus textarea on mount', async () => {
        const wrapper = doShallowMount({ attachTo: document.body });
        const textareaElement = wrapper.find('textarea');
        
        await wrapper.vm.$nextTick();

        expect(document.activeElement).toBe(textareaElement.element);
    });

    it('should set the textarea height based on its scrollHeight as text changes', async () => {
        const getHeight = (textareaElement) => window.getComputedStyle(textareaElement).height;

        const wrapper = doShallowMount();

        await wrapper.vm.$nextTick();
        expect(getHeight(wrapper.find('textarea').element)).toBe('0px');
        
        const mockHeight = 200;
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { value: mockHeight });
        
        wrapper.find('textarea').setValue('MOCK TEXT');
        wrapper.find('textarea').trigger('input');

        await wrapper.vm.$nextTick();
        expect(getHeight(wrapper.find('textarea').element)).toBe(`${mockHeight}px`);
    });
});
