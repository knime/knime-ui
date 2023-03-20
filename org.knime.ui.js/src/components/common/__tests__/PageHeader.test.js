import { expect, describe, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PageHeader from '../PageHeader.vue';

describe('PageHeader.vue', () => {
    const doMount = ({ props = {} } = {}) => {
        const defaultProps = { title: 'Example' };
        const wrapper = mount(PageHeader, {
            propsData: { ...defaultProps, ...props }
        });

        return { wrapper };
    };

    it('should display title', () => {
        const { wrapper } = doMount({ props: { title: 'This is the title' } });

        expect(wrapper.find('.title').text()).toMatch('This is the title');
    });

    it('should display subtitle', () => {
        const { wrapper } = doMount({ props: { subtitle: 'This is the title' } });

        expect(wrapper.find('.subtitle').text()).toMatch('This is the title');
    });

    it('should use offset', () => {
        const { wrapper } = doMount({ props: { leftOffset: 4 } });

        expect(wrapper.find('.grid-item-4').exists()).toBe(true);
        expect(wrapper.find('.title-wrapper').classes()).toContain('grid-item-8');
    });
});
