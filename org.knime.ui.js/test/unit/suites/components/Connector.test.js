/* eslint-disable no-magic-numbers */
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import Connector from '~/components/Connector';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import * as portShift from '~/util/portShift';

describe('Connector', () => {
    let propsData, mocks, wrapper, portShiftMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        propsData = {
            sourceNode: 'root:1',
            destNode: 'root:2',
            sourcePort: 0,
            destPort: 2
        };
        const $store = mockVuexStore({
            workflows: {
                state: {
                    workflow: {
                        nodes: {
                            'root:1': { position: { x: 0, y: 0 }, outPorts: [null, null] },
                            'root:2': { position: { x: 12, y: 14 }, inPorts: [null, null, null] }
                        }
                    }
                }
            }
        });
        portShiftMock = jest.spyOn(portShift, 'default');
        mocks = { $shapes, $colors, $store };
        wrapper = shallowMount(Connector, { propsData, mocks });
    });


    describe('render', () => {

        it('uses portShift', () => {
            expect(portShiftMock).toHaveBeenCalledWith(0, 2);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3);
        });

        it('draws a path', () => {
            const expectedPath = 'M36.5,-4.5 C68.25,-4.5 -28.75,40.5 3,40.5';
            expect(wrapper.find('path').attributes().d).toBe(expectedPath);
        });

        it('applies styles', () => {
            const { 'stroke-width': strokeWidth } = wrapper.find('path').attributes();
            expect(parseFloat(strokeWidth)).toBe($shapes.connectorWidth);
        });
    });


});
