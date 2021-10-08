/* eslint-disable no-magic-numbers */

import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

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
            position: { x, y },
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

            // global positioning
            expect(wrapper.find('g').attributes('transform')).toEqual(`translate(${x}, ${y})`);

            // visible port bar
            let portBar = wrapper.find('.port-bar');
            expect(Number(portBar.attributes('width'))).toEqual($shapes.metaNodeBarWidth);
            expect(Number(portBar.attributes('height'))).toEqual(height);
            if (type === 'in') {
                expect(Number(portBar.attributes('x'))).toEqual(-$shapes.metaNodeBarWidth);
            } else {
                expect(Number(portBar.attributes('x'))).toEqual(0);
            }

            // invisible hover-area
            let hoverArea = wrapper.find('.hover-area');
            expect(Number(hoverArea.attributes('width'))).toEqual(
                $shapes.metaNodeBarWidth + $shapes.metaNodeBarHorizontalPadding * 2
            );
            expect(Number(hoverArea.attributes('height'))).toEqual(height);
            if (type === 'in') {
                expect(Number(hoverArea.attributes('x'))).toEqual(
                    -$shapes.metaNodeBarWidth - $shapes.metaNodeBarHorizontalPadding
                );
            } else {
                expect(Number(hoverArea.attributes('x'))).toEqual(-$shapes.metaNodeBarHorizontalPadding);
            }
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

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            let [port0, port1] = ports.wrappers;

            expect(ports.length).toBe(2);

            expect(port0.props()).toStrictEqual({
                port: propsData.ports[0],
                direction: type === 'in' ? 'out' : 'in',
                nodeId: 'metanode:1',
                relativePosition: [
                    $shapes.portSize / 2 * (type === 'in' ? 1 : -1),
                    549 / (ports.length + 1)
                ],
                targeted: null
            });

            expect(port1.props()).toStrictEqual({
                port: propsData.ports[1],
                direction: type === 'in' ? 'out' : 'in',
                nodeId: 'metanode:1',
                relativePosition: [
                    $shapes.portSize / 2 * (type === 'in' ? 1 : -1),
                    2 * 549 / (ports.length + 1)
                ],
                targeted: null
            });
        });

        it('sets target port', async () => {
            propsData.ports = [{
                index: 0,
                type: 'type0'
            }, {
                index: 1,
                type: 'type1'
            }];
            doShallowMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            let [port0, port1] = ports.wrappers;

            expect(port0.props('targeted')).toBeFalsy();
            expect(port1.props('targeted')).toBeFalsy();

            // set target port 0
            wrapper.setData({
                targetPort: {
                    index: 0
                }
            });
            await Vue.nextTick();
            expect(port0.props('targeted')).toBe(true);
            expect(port1.props('targeted')).toBeFalsy();

            // set target port 1
            wrapper.setData({
                targetPort: {
                    index: 1
                }
            });
            await Vue.nextTick();
            expect(port0.props('targeted')).toBeFalsy();
            expect(port1.props('targeted')).toBe(true);
        });
    });
});
