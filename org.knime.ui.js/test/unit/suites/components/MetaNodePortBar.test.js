import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';


import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

import MetaNodePortBar from '~/components/MetaNodePortBar';
import Port from '~/components/Port';

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
            ports: []
        };
        $store = mockVuexStore({
            workflow: {
                state: {},
                getters: {
                    workflowBounds() {
                        return {
                            left: 0,
                            right: 500
                        };
                    },
                    svgBounds() {
                        return {
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
                expect(Number(rect.attributes('x'))).toEqual(-$shapes.metaNodeBarWidth);
            } else {
                expect(rect.attributes('x')).toBeFalsy();
            }
            expect(wrapper.find('g').attributes('transform')).toEqual(`translate(${x}, ${y})`);
        });

        it('renders ports', () => {
            propsData.ports = [{
                index: 0,
                type: 'type0'
            }, {
                index: 1,
                type: 'type1'
            }];
            doShallowMount();
            let ports = wrapper.findAllComponents(Port);
            expect(ports.length).toBe(2);
            expect(ports.at(0).props('port')).toEqual({ index: 0, type: 'type0' });
            expect(ports.at(1).props('port')).toEqual({ index: 1, type: 'type1' });
            expect(ports.at(0).props('x')).toEqual($shapes.portSize / 2 * (type === 'in' ? 1 : -1));
            expect(ports.at(1).props('x')).toEqual($shapes.portSize / 2 * (type === 'in' ? 1 : -1));
            expect(ports.at(0).props('y')).toEqual(height / (ports.length + 1));
            expect(ports.at(1).props('y')).toEqual(2 * height / (ports.length + 1));
        });
    });

});
