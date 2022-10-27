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
    });
});
