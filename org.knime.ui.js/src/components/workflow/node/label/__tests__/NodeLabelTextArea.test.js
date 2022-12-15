import { shallowMount } from '@vue/test-utils';
import { clear as clearUserAgent, mockUserAgent } from 'jest-useragent-mock';

import * as $shapes from '@/style/shapes.mjs';

import NodeLabelTextArea from '../NodeLabelTextArea.vue';

describe('NodeLabelTextArea', () => {
    const mockSizeChangeFn = jest.fn();

    const doShallowMount = (opts = { propsData: { value: '' } }) => {
        const wrapper = shallowMount(NodeLabelTextArea, {
            ...opts,
            mocks: {
                $shapes,
                mockSizeChangeFn
            },
            stubs: {
                NodeLabelText: {
                    template: `<div id="node-label-stub"><slot :on="{ sizeChange: mockSizeChangeFn }"></slot></div>`
                }
            }
        });

        return wrapper;
    };

    afterEach(() => {
        clearUserAgent();
    });

    it('render with given value as text', () => {
        const value = 'test';
        const wrapper = doShallowMount({ propsData: { value } });
        expect(wrapper.find('textarea').element.value).toBe(value);
    });

    it('should call the size change callback provided by the slot of the NodeLabelText', () => {
        const wrapper = doShallowMount();

        wrapper.find('textarea').trigger('input');

        expect(mockSizeChangeFn).toHaveBeenCalled();
    });

    it('should emit "save" on control and enter', () => {
        const wrapper = doShallowMount();
        mockUserAgent('windows');

        wrapper.find('textarea').trigger('keydown.enter', { ctrlKey: true });

        expect(wrapper.emitted('save')).toBeDefined();
    });

    it('should emit "save" on command and enter on mac', () => {
        const wrapper = doShallowMount();
        mockUserAgent('mac');

        wrapper.find('textarea').trigger('keydown.enter', { metaKey: true });

        expect(wrapper.emitted('save')).toBeDefined();
    });

    it('should emit "cancel" on escape', () => {
        const wrapper = doShallowMount();

        wrapper.find('textarea').trigger('keydown.esc');

        expect(wrapper.emitted('cancel')).toBeDefined();
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
