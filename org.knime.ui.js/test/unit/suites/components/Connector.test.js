/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import Connector from '~/components/Connector';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import * as portShift from '~/util/portShift';

const portMock = {
    connectedVia: []
};

describe('Connector', () => {
    let propsData, mocks, wrapper, portShiftMock, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
        portShiftMock = jest.spyOn(portShift, 'default');
    });

    beforeEach(() => {
        propsData = {
            sourceNode: 'root:1',
            destNode: 'root:2',
            sourcePort: 0,
            destPort: 2
        };
    });


    describe('metanode', () => {
        beforeEach(() => {
            $store = mockVuexStore({
                workflows: {
                    state: {
                        workflow: {
                            id: 'some id',
                            nodeIds: ['root:1', 'root:2']
                        }
                    }
                },
                nodes: {
                    state: {
                        'some id': {
                            'root:1': {
                                kind: 'metanode',
                                position: { x: 2, y: 2 },
                                outPorts: [portMock, portMock]
                            },
                            'root:2': {
                                kind: 'metanode',
                                position: { x: 12, y: 14 },
                                inPorts: [portMock, portMock, portMock]
                            }
                        }
                    }
                }
            });

            mocks = { $shapes, $colors, $store };
            wrapper = shallowMount(Connector, { propsData, mocks });
        });

        it('uses portShift', () => {
            expect(portShiftMock).toHaveBeenCalledWith(0, 2, true, true);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3, true);
        });

        it('draws a path', () => {
            const expectedPath = 'M38.5,7.5 h4.5 C69.5,7.5 -23.5,40.5 3,40.5 h4.5';
            expect(wrapper.find('path').attributes().d).toBe(expectedPath);
        });

    });

    describe('other', () => {

        beforeEach(() => {
            $store = mockVuexStore({
                workflows: {
                    state: {
                        workflow: {
                            id: 'myId',
                            nodeIds: ['root:1', 'root:2']
                        }
                    }
                },
                nodes: {
                    state: {
                        myId: {
                            'root:1': { position: { x: 0, y: 0 }, outPorts: [portMock, portMock] },
                            'root:2': { position: { x: 12, y: 14 }, inPorts: [portMock, portMock, portMock] }
                        }
                    }
                }
            });

            mocks = { $shapes, $colors, $store };
            wrapper = shallowMount(Connector, { propsData, mocks });
        });

        it('uses portShift', () => {
            expect(portShiftMock).toHaveBeenCalledWith(0, 2, false, true);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3, false);
        });

        it('draws a path', () => {
            const expectedPath = 'M32,-4.5 h4.5 C63.75,-4.5 -24.25,40.5 3,40.5 h4.5';
            expect(wrapper.find('path').attributes().d).toBe(expectedPath);
        });

        it('applies styles', () => {
            const { 'stroke-width': strokeWidth } = wrapper.find('path').attributes();
            expect(parseFloat(strokeWidth)).toBe($shapes.connectorWidth);
        });
    });

});
