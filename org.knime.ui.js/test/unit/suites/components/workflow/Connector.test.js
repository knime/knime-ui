/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Connector from '~/components/workflow/Connector';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import * as portShift from '~/util/portShift';
import * as workflowStoreConfig from '~/store/workflow';
import connectorPath from '~/util/connectorPath';

jest.mock('~api', () => { }, { virtual: true });
jest.mock('~/util/connectorPath', () => jest.fn());

describe('Connector.vue', () => {
    let portMock, propsData, mocks, wrapper, portShiftMock, $store, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
        portShiftMock = jest.spyOn(portShift, 'default');
    });

    beforeEach(() => {
        propsData = {
            sourceNode: 'root:1',
            destNode: 'root:2',
            id: 'root:2_2',
            allowedActions: {
                canDelete: true
            },
            sourcePort: 0,
            destPort: 2
        };
        portMock = {
            type: 'table',
            connectedVia: []
        };
    });

    describe('attached to a metanode', () => {
        let doShallowMount;

        beforeEach(() => {
            doShallowMount = () => {
                storeConfig = {
                    workflow: {
                        ...workflowStoreConfig,
                        state: {
                            activeWorkflow: {
                                nodes: {
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
                        },
                        getters: {
                            isWritable() {
                                return true;
                            }
                        }
                    },
                    selection: {
                        getters: {
                            isConnectionSelected: () => jest.fn()
                        },
                        actions: {
                            selectConnection: jest.fn(),
                            deselectConnection: jest.fn(),
                            deselectAllObjects: jest.fn()
                        }
                    }
                };
                $store = mockVuexStore(storeConfig);
                mocks = { $shapes, $colors, $store };
                wrapper = shallowMount(Connector, { propsData, mocks });
            };
        });

        it('uses portShift', () => {
            doShallowMount();
            expect(portShiftMock).toHaveBeenCalledWith(0, 2, true, true);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3, true, false);
        });

        it('draws a path between table ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            doShallowMount();
            expect(connectorPath).toHaveBeenCalledWith(38.5, 7.5, 7.5, 40.5);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('draws a path between other ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            portMock.type = 'foo';
            doShallowMount();
            expect(connectorPath).toHaveBeenCalledWith(38.5, 7.5, 7.5, 40.5);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });
    });

    describe('attached to other node', () => {
        let doShallowMount;

        beforeEach(() => {
            storeConfig = {
                workflow: {
                    ...workflowStoreConfig,
                    state: {
                        activeWorkflow: {
                            nodes: {
                                'root:1': { position: { x: 0, y: 0 }, outPorts: [portMock, portMock] },
                                'root:2': { position: { x: 12, y: 14 }, inPorts: [portMock, portMock, portMock] }
                            }
                        }
                    },
                    getters: {
                        isWritable() {
                            return true;
                        }
                    }
                },
                selection: {
                    getters: {
                        isConnectionSelected: () => jest.fn()
                    },
                    actions: {
                        selectConnection: jest.fn(),
                        deselectConnection: jest.fn(),
                        deselectAllObjects: jest.fn()
                    }
                }
            };

            doShallowMount = () => {
                $store = mockVuexStore(storeConfig);
                mocks = { $shapes, $colors, $store };
                wrapper = shallowMount(Connector, { propsData, mocks });
            };
        });

        it('draws grab cursor by default', () => {
            doShallowMount();
            expect(wrapper.find('.read-only').exists()).toBe(false);
        });

        it('selects the connection', async () => {
            doShallowMount();
            await wrapper.find('g path').trigger('click', { button: 0 });

            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectConnection).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:2_2')
            );
        });

        it('shift-click adds to selection', async () => {
            doShallowMount();
            await wrapper.find('g path').trigger('click', { button: 0, shiftKey: true });

            expect(storeConfig.selection.actions.deselectConnection).not.toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectConnection).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:2_2')
            );
        });

        it('shift-click removes from selection', async () => {
            storeConfig.selection.getters.isConnectionSelected = () => jest.fn().mockReturnValue(true);
            doShallowMount();
            await wrapper.find('g path').trigger('click', { button: 0, shiftKey: true });

            expect(storeConfig.selection.actions.deselectConnection).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectConnection).not.toHaveBeenCalled();
        });

        it('draws no grab cursor if write protected', () => {
            $store = mockVuexStore({
                workflow: {
                    ...workflowStoreConfig,
                    state: {
                        activeWorkflow: {
                            projectId: 'myId',
                            nodes: {
                                'root:1': { position: { x: 0, y: 0 }, outPorts: [portMock, portMock] },
                                'root:2': { position: { x: 12, y: 14 }, inPorts: [portMock, portMock, portMock] }
                            },
                            info: {
                                linked: true
                            }
                        }
                    },
                    getters: {
                        isWritable() {
                            return false;
                        }
                    }
                },
                selection: {
                    getters: {
                        isConnectionSelected: () => jest.fn()
                    }
                }
            });
            mocks = { $shapes, $colors, $store };
            wrapper = shallowMount(Connector, { propsData, mocks });
            expect(wrapper.find('.read-only').exists()).toBe(true);
        });

        it('draws dashed lines when streaming', () => {
            $store = mockVuexStore({
                workflow: {
                    ...workflowStoreConfig,
                    state: {
                        activeWorkflow: {
                            projectId: 'myId',
                            nodes: {
                                'root:1': { position: { x: 0, y: 0 }, outPorts: [portMock, portMock] },
                                'root:2': { position: { x: 12, y: 14 }, inPorts: [portMock, portMock, portMock] }
                            }
                        }
                    },
                    getters: {
                        isWritable() {
                            return true;
                        },
                        isStreaming() {
                            return true;
                        }
                    }
                }
            });
            propsData.streaming = true;
            wrapper = shallowMount(Connector, { propsData, mocks });
            expect(wrapper.find('.dashed').exists()).toBe(true);
        });

        it('uses portShift', () => {
            doShallowMount();
            expect(portShiftMock).toHaveBeenCalledWith(0, 2, false, true);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3, false, false);
        });

        it('draws a path between table ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            doShallowMount();

            expect(connectorPath).toHaveBeenCalledWith(32, -4.5, 7.5, 40.5);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('draws a path between other ports', () => {
            portMock.type = 'foo';
            connectorPath.mockReturnValueOnce('that path');
            doShallowMount();

            expect(connectorPath).toHaveBeenCalledWith(32, -4.5, 7.5, 40.5);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('applies styles for flow variable ports', () => {
            mocks = { $shapes, $colors, $store };
            wrapper = shallowMount(Connector, {
                propsData: {
                    ...propsData,
                    flowVariableConnection: true
                },
                mocks
            });

            const { 'stroke-width': strokeWidth, stroke } = wrapper.findAll('path').at(1).attributes();
            expect(parseFloat(strokeWidth)).toBe($shapes.connectorWidth);
            expect(stroke).toBe($colors.connectorColors.flowVariable);
        });

        it('applies styles for other ports', () => {
            doShallowMount();
            const { 'stroke-width': strokeWidth, stroke } = wrapper.findAll('path').at(1).attributes();
            expect(parseFloat(strokeWidth)).toBe($shapes.connectorWidth);
            expect(stroke).toBe($colors.connectorColors.default);
        });
    });

    describe('attached to port bars inside metanode', () => {
        let doShallowMount;

        beforeEach(() => {
            doShallowMount = () => {
                $store = mockVuexStore({
                    workflow: {
                        ...workflowStoreConfig,
                        state: {
                            activeWorkflow: {
                                projectId: 'some id',
                                nodes: {},
                                metaInPorts: {
                                    xPos: 100,
                                    ports: [portMock]
                                },
                                metaOutPorts: {
                                    xPos: 702,
                                    ports: [portMock, portMock, portMock]
                                },
                                info: {}
                            }
                        },
                        getters: {
                            ...workflowStoreConfig.getters,
                            isWritable() {
                                return true;
                            }
                        }
                    },
                    canvas: {
                        getters: {
                            contentBounds() {
                                return {
                                    top: 33,
                                    height: 1236
                                };
                            }
                        }
                    },
                    selection: {
                        getters: {
                            isConnectionSelected: () => jest.fn()
                        }
                    }
                });
                mocks = { $shapes, $colors, $store };
                wrapper = shallowMount(Connector, { propsData, mocks });
            };
        });

        it('draws a path between table ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            doShallowMount();

            expect(connectorPath).toHaveBeenCalledWith(104.5, 651, 697.5, 960);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('draws a path between other ports', () => {
            portMock.type = 'foo';
            connectorPath.mockReturnValueOnce('that path');
            doShallowMount();

            expect(connectorPath).toHaveBeenCalledWith(104.5, 651, 697.5, 960);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });
    });

    describe('follows pointer', () => {
        let doShallowMount;

        beforeEach(() => {
            storeConfig = {
                workflow: {
                    ...workflowStoreConfig,
                    state: {
                        activeWorkflow: {
                            nodes: {
                                'root:1': { position: { x: 0, y: 0 }, outPorts: [portMock, portMock] },
                                'root:2': { position: { x: 32, y: 0 }, inPorts: [portMock, portMock] }
                            }
                        }
                    },
                    getters: {
                        isWritable() {
                            return true;
                        }
                    }
                },
                selection: {
                    getters: {
                        isConnectionSelected: () => jest.fn()
                    }
                }
            };

            doShallowMount = () => {
                $store = mockVuexStore(storeConfig);
                mocks = { $shapes, $colors, $store };
                wrapper = shallowMount(Connector, { propsData, mocks });
            };
        });

        it('draw connector forward', () => {
            propsData = {
                sourceNode: 'root:1',
                sourcePort: 1,
                absolutePoint: [32, 16],
                allowedActions: {
                    canDelete: false
                },
                id: 'drag-connector'
            };
            connectorPath.mockReturnValueOnce('that path');
            doShallowMount();

            expect(connectorPath).toHaveBeenCalledWith(36.5, 16, 32, 16);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('draw connector backwards', () => {
            propsData = {
                destNode: 'root:2',
                destPort: 1,
                absolutePoint: [0, 16],
                allowedActions: {
                    canDelete: false
                },
                id: 'drag-connector'
            };
            connectorPath.mockReturnValueOnce('that path');
            doShallowMount();

            expect(connectorPath).toHaveBeenCalledWith(0, 16, 27.5, 16);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });
    });
});
