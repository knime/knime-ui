import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';


import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

import MetaNodePortBar from '~/components/MetaNodePortBar';
import DraggablePortWithTooltip from '~/components/DraggablePortWithTooltip.vue';

describe('MetaNodePortBar.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store;
    const x = 222;
    const y = 123;
    const height = 549;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            x,
            y,
            ports: [],
            containerId: 'metanode:1'
        };
        $store = mockVuexStore({
            canvas: {
                state: {},
                getters: {
                    contentBounds() {
                        return {
                            left: 0,
                            top: 0,
                            width: 500,
                            height
                        };
                    }
                }
            }
        });

        mocks = { $store, $shapes, $colors };
        doShallowMount = () => {
            wrapper = shallowMount(MetaNodePortBar, { propsData, mocks });
        };
    });

    describe.each(['in', 'out'])('type "%s"', type => {
        beforeEach(() => {
            propsData.type = type;
        });

        it('renders a bar', () => {
            doShallowMount();
            let rect = wrapper.find('rect');
            expect(Number(rect.attributes('width'))).toEqual($shapes.metaNodeBarWidth);
            expect(Number(rect.attributes('height'))).toEqual(height);
            if (type === 'in') {
                expect(Number(rect.attributes('x'))).toEqual(222 - $shapes.metaNodeBarWidth);
            } else {
                expect(Number(rect.attributes('x'))).toEqual(222);
            }
            expect(wrapper.find('g').attributes('transform')).toEqual(`translate(0, ${y})`);
        });

        it('renders ports', () => {
            propsData.ports = [{
                index: 0,
                type: 'type0',
            }, {
                index: 1,
                type: 'type1'
            }];
            doShallowMount();
            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            expect(ports.length).toBe(2);

            let [port0, port1] = ports.wrappers;

            expect(port0.props()).toStrictEqual({
                port: propsData.ports[0],
                direction: type === 'in' ? 'out' : 'in',
                nodeId: 'metanode:1',
                relativePosition: [
                    222 + $shapes.portSize / 2 * (type === 'in' ? 1 : -1),
                    549 / (ports.length + 1)
                ]
            });

            expect(port1.props()).toStrictEqual({
                port: propsData.ports[1],
                direction: type === 'in' ? 'out' : 'in',
                nodeId: 'metanode:1',
                relativePosition: [
                    222 + $shapes.portSize / 2 * (type === 'in' ? 1 : -1),
                    2 * 549 / (ports.length + 1)
                ]
            });
        });
    });
});
