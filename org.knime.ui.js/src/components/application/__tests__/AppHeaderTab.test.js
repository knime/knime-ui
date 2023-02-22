import { shallowMount } from '@vue/test-utils';

import AppHeaderTab from '../AppHeaderTab.vue';
import CloseButton from '@/components/common/CloseButton.vue';

describe('AppHeaderTab.vue', () => {
    const doMount = (props = {}) => {
        const defaultProps = {
            name: 'MockTab',
            projectId: '1',
            isActive: false,
            isHoveredOver: false,
            windowWidth: 1024
        };

        return shallowMount(AppHeaderTab, { props: { ...defaultProps, ...props } });
    };

    describe('hover', () => {
        it('should set the "hovered" class when `isHoveredOver` prop is true', () => {
            const wrapper = doMount({ isHoveredOver: true });
            expect(wrapper.find('li').classes()).toContain('hovered');
        });

        it('should emit hover event', async () => {
            const wrapper = doMount({ projectId: '2' });

            await wrapper.find('li').trigger('mouseover');
            expect(wrapper.emitted('hover')[0][0]).toBe('2');

            await wrapper.find('li').trigger('mouseleave');
            expect(wrapper.emitted('hover')[1][0]).toBe(null);
        });
    });


    it('should set the "active" class when the `isActive` prop is true', () => {
        const wrapper = doMount({ isActive: true });
        expect(wrapper.find('li').classes()).toContain('active');
    });

    describe('switch workflow', () => {
        it('should emit a switchWorkflow event when the tab is NOT active', () => {
            const wrapper = doMount({ projectId: '1' });

            wrapper.find('li').trigger('click');
            expect(wrapper.emitted('switchWorkflow')[0][0]).toBe('1');
        });

        it('should not emit a switchWorkflow event when the tab is active', () => {
            const wrapper = doMount({ projectId: '1', isActive: true });

            wrapper.find('li').trigger('click');
            expect(wrapper.emitted('switchWorkflow')).toBeUndefined();
        });
    });

    it('should emit a close-workflow event on middle click', async () => {
        const wrapper = doMount({ projectId: '1' });

        // testing click with middle click works best with triggering mouseup
        await wrapper.trigger('mouseup', { button: 1 });

        expect(wrapper.emitted('close-workflow')[0][0]).toBe('1');
    });


    it('should emit a close-workflow event if the close button is pressed', async () => {
        const wrapper = doMount({ projectId: '1' });

        const stopPropagation = jest.fn();
        await wrapper.findComponent(CloseButton).vm.$emit('close', { stopPropagation });

        expect(stopPropagation).toHaveBeenCalled();
        expect(wrapper.emitted('closeWorkflow')[0][0]).toBe('1');
    });

    describe('truncates the workflow name', () => {
        const longName = `
            03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_
            Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transform_Using_Rule_En
            gine_and_String_Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transfo
            rm_Using_Rule_Engine_and_String_Manipulation
        `.trim();

        it.each([
            // [viewport size, max characters]
            [400, 10],
            [700, 20],
            [1000, 50],
            [1366, 100],
            [1800, 150],
            [2200, 200],
            [3000, 256]
        ])('truncates the name for a %spx width to a max of %s characters long', (width, maxChars) => {
            window.innerWidth = width;

            const wrapper = doMount({ name: longName, windowWidth: width });

            const nameElement = wrapper.find('.text');

            // +2 to account for the " …"
            expect(nameElement.text().length).toBe(maxChars + 2);
        });
    });
});
