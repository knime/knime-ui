/* eslint-disable no-magic-numbers */
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import Connector from '~/components/Connector';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import * as portShift from '~/util/portShift';

const mockNode = ({ x, y, outPorts, inPorts }) => ({
    uIInfo: { bounds: { x, y } },
    inPorts,
    outPorts
});

describe('Connector', () => {
    let propsData, mocks, mount, wrapper, portShiftMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            source: 'root:1',
            dest: 'root:2',
            sourcePort: 0,
            destPort: 2
        };
        const $store = mockVuexStore({
            workflows: {
                state: {
                    workflow: {
                        nodes: {
                            'root:1': mockNode({ x: 0, y: 0, outPorts: [null, null] }),
                            'root:2': mockNode({ x: 10, y: 10, inPorts: [null, null, null] })
                        }
                    }
                }
            }
        });
        portShiftMock = jest.spyOn(portShift, 'default');
        mocks = { $shapes, $colors, $store };
        mount = () => { wrapper = shallowMount(Connector, { propsData, mocks }); };
    });


    describe('render', () => {
        beforeEach(() => {
            mount();
        });

        it('uses portShift', () => {
            expect(portShiftMock).toHaveBeenCalledWith(0, 2);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3);
        });

        it('path equals', () => {
            const expectedPath = 'M36.5,-4.5 C67.91666666666667,-4.5 -30.416666666666664,36.5 1,36.5';
            expect(wrapper.find('path').attributes().d).toBe(expectedPath);
        });

        it('styles', () => {
            const { 'stroke-width': strokeWidth } = wrapper.find('path').attributes();
            expect(parseFloat(strokeWidth)).toBe($shapes.connectorWidth);
        });
    });


});
