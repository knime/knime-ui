import { shallowMount } from '@vue/test-utils';
import * as $shapes from '@/style/shapes.mjs';

import QuickAddNodeGhost from '../QuickAddNodeGhost.vue';

describe('QuickAddNodeGhost.vue', () => {
    let propsData, doMount;

    beforeEach(() => {
        propsData = {
            position: [5, 8]
        };

        doMount = () => {
            let mocks = {
                $shapes: {
                    ...$shapes,
                    portSize: 10,
                    addNodeGhostSize: 20
                }
            };

            return shallowMount(QuickAddNodeGhost, {
                propsData,
                mocks
            });
        };
    });

    describe('Ghost', () => {
        it('renders', () => {
            let wrapper = doMount();
            expect(wrapper.html()).toBeTruthy();
        });

        it('positions correctly', () => {
            let wrapper = doMount();
            const gs = wrapper.findAll('g');
            const posGroup = gs.at(0);
            const centerGroup = gs.at(1);
            expect(posGroup.attributes('transform')).toBe('translate(5,8)');
            expect(centerGroup.attributes('transform')).toBe('translate(5,-10)');
        });

        it('uses the size shape', () => {
            let wrapper = doMount();
            const rect = wrapper.find('rect');
            expect(rect.attributes('width')).toBe('20');
            expect(rect.attributes('height')).toBe('20');
        });
    });
});
