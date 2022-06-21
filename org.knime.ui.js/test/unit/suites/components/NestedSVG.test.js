import { mount } from '@vue/test-utils';
import NestedSVG from '~knime-ui/components/NestedSVG';

describe('NestedSVG', () => {
    it('renders svg and passes attributes', () => {
        let wrapper = mount(NestedSVG, {
            slots: {
                default: [{ template: '<svg />' }]
            },
            attrs: {
                width: '200',
                x: '-10'
            }
        });
        expect(wrapper.html()).toBe('<svg width="200" x="-10"></svg>');
    });
});
