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

describe('Connector.vue', () => {
    let propsData, mocks, provide, wrapper, portShiftMock, $store;

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
        provide = {
            readOnly: false
        };
    });

    describe('attached to a metanode', () => {
        beforeEach(() => {
            $store = mockVuexStore({
                workflow: {
                    state: {
                        activeWorkflow: {
                            projectId: 'some id',
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
            wrapper = shallowMount(Connector, { propsData, mocks, provide });
        });

        it('uses portShift', () => {
            expect(portShiftMock).toHaveBeenCalledWith(0, 2, true, true);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3, true, false);
        });

        it('draws a path', () => {
            const expectedPath = 'M38.5,7.5 h4.5 C69.5,7.5 -23.5,40.5 3,40.5 h4.5';
            expect(wrapper.find('path').attributes().d).toBe(expectedPath);
        });

    });

    describe('attached to other node', () => {

        beforeEach(() => {
            $store = mockVuexStore({
                workflow: {
                    state: {
                        activeWorkflow: {
                            projectId: 'myId',
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
            wrapper = shallowMount(Connector, { propsData, mocks, provide });
        });

        it('draws no grab cursor on write-protect', () => {
            expect(wrapper.find('.read-only').exists()).toBe(false);
            wrapper = shallowMount(Connector, {
                propsData,
                mocks,
                provide: { readOnly: true }
            });
            expect(wrapper.find('.read-only').exists()).toBe(true);
        });

        it('uses portShift', () => {
            expect(portShiftMock).toHaveBeenCalledWith(0, 2, false, true);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3, false, false);
        });

        it('draws a path', () => {
            const expectedPath = 'M32,-4.5 h4.5 C63.75,-4.5 -24.25,40.5 3,40.5 h4.5';
            expect(wrapper.find('path').attributes().d).toBe(expectedPath);
        });

        it('applies styles for flow variable ports', () => {
            mocks = { $shapes, $colors, $store };
            wrapper = shallowMount(Connector, {
                propsData: {
                    ...propsData,
                    flowVariableConnection: true
                },
                mocks,
                provide
            });

            const { 'stroke-width': strokeWidth, stroke } = wrapper.find('path').attributes();
            expect(parseFloat(strokeWidth)).toBe($shapes.connectorWidth);
            expect(stroke).toBe($colors.connectorColors.variable);
        });

        it('applies styles for other ports', () => {
            const { 'stroke-width': strokeWidth, stroke } = wrapper.find('path').attributes();
            expect(parseFloat(strokeWidth)).toBe($shapes.connectorWidth);
            expect(stroke).toBe($colors.connectorColors.default);
        });
    });

    describe('attached to port bars inside metanode', () => {
        beforeEach(() => {
            $store = mockVuexStore({
                workflow: {
                    state: {
                        activeWorkflow: {
                            projectId: 'some id',
                            nodeIds: ['root:1', 'root:2'],
                            metaInPorts: {
                                xPos: 100,
                                ports: [portMock]
                            },
                            metaOutPorts: {
                                xPos: 702,
                                ports: [portMock, portMock, portMock]
                            }
                        }
                    },
                    getters: {
                        svgBounds() {
                            return {
                                y: 33,
                                height: 1236
                            };
                        }
                    }
                },
                nodes: {
                    state: {
                        'some id': {}
                    }
                }
            });
            mocks = { $shapes, $colors, $store };
            wrapper = shallowMount(Connector, { propsData, mocks, provide });
        });

        it('draws a path', () => {
            const expectedPath = 'M104.5,651 h4.5 C499.5,651 302.5,960 693,960 h4.5';
            expect(wrapper.find('path').attributes().d).toBe(expectedPath);
        });

    });
});
