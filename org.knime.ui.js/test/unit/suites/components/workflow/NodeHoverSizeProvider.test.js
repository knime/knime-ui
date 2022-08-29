/* eslint-disable no-magic-numbers */
import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';
import NodeHoverSizeProvider from '~/components/workflow/NodeHoverSizeProvider.vue';

describe('NodeHoverSizeProvider', () => {
    const portPositions = {
        in: [[30, 0], [30, 10], [30, 60]],
        out: [[30, 0], [30, 10], [30, 60]]
    };

    const nodeNameDimensions = {
        height: 0
    };

    const doShallowMount = (customProps = {}) => shallowMount(NodeHoverSizeProvider, {
        propsData: {
            isHovering: true,
            nodeNameDimensions,
            portPositions,
            ...customProps
        },
        mocks: {
            $shapes
        },
        scopedSlots: {
            default: `<span 
                class="slot-content"
                :width="props.hoverSize.width" 
                :height="props.hoverSize.height" 
                :x="props.hoverSize.y" 
                :y="props.hoverSize.x" 
            ></span>`
        }
    });

    const getHoverAttribute = (wrapper, attributeName) => Number(
        wrapper.find('.slot-content').attributes(attributeName)
    );

    it('considers the node name height to determine the hover size', async () => {
        const wrapper = doShallowMount();

        const heightBefore = getHoverAttribute(wrapper, 'height');

        await wrapper.setProps({ nodeNameDimensions: { height: 20 } });

        const heightAfter = getHoverAttribute(wrapper, 'height');

        expect(heightAfter).toEqual(heightBefore + 20);
    });

    it('considers the port positions to determine the hover size', async () => {
        const wrapper = doShallowMount({ portPositions: { in: [], out: [] } });

        const heightBefore = getHoverAttribute(wrapper, 'height');
        
        await wrapper.setProps({ portPositions });
        
        const heightAfter = getHoverAttribute(wrapper, 'height');
        
        expect(heightAfter).toBeGreaterThan(heightBefore);
        expect(heightAfter).toEqual(108.5);
    });

    it('considers the allowed node actions to determine the hover size', async () => {
        const allowedActions = {
            canOpenDialog: true,
            canOpenView: true
        };
        const wrapper = doShallowMount();

        const widthBefore = getHoverAttribute(wrapper, 'width');

        await wrapper.setProps({ allowedActions });

        const widthAfter = getHoverAttribute(wrapper, 'width');

        expect(widthAfter).toBeGreaterThan(widthBefore);
    });
});
