import { expect, describe, beforeAll, beforeEach, afterEach, it, vi } from 'vitest';
/* eslint-disable max-lines */
import * as Vue from 'vue';
import gsap from 'gsap';
import { merge } from 'lodash';
import { shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/utils/mockVuexStore';

import { $bus } from '@/plugins/event-bus';
import * as workflowStoreConfig from '@/store/workflow';

import * as $shapes from '@/style/shapes.mjs';
import * as $colors from '@/style/colors.mjs';

import * as portShift from '@/util/portShift';
import connectorPath from '@/util/connectorPath';

import Connector from '../Connector.vue';

vi.mock('@/util/connectorPath', () => ({ default: vi.fn() }));
vi.mock('gsap', () => ({ default: { to: vi.fn() } }));

describe('Connector.vue', () => {
    let portShiftMock;

    beforeAll(() => {
        portShiftMock = vi.spyOn(portShift, 'default');
    });

    const defaultProps = {
        sourceNode: 'root:1',
        destNode: 'root:2',
        id: 'root:2_2',
        allowedActions: {
            canDelete: true
        },
        sourcePort: 0,
        destPort: 2
    };

    const defaultPortMock = {
        type: 'table',
        connectedVia: []
    };

    const doShallowMount = ({ props = defaultProps, storeConfig } = {}) => {
        const $store = mockVuexStore(storeConfig);

        return shallowMount(Connector, {
            props,
            global: { plugins: [$store], mocks: { $colors, $shapes, $bus } }
        });
    };

    const getStoreConfig = ({ customPortMock, customStoreConfig = {} } = {}) => {
        const portMock = { ...defaultPortMock, ...customPortMock };

        return merge({
            application: {
                actions: {
                    toggleContextMenu: vi.fn()
                }
            },
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
                    },
                    isDragging() {
                        return false;
                    }
                }
            },
            selection: {
                getters: {
                    isConnectionSelected: () => vi.fn(),
                    singleSelectedNode: vi.fn(),
                    selectedConnections: vi.fn().mockReturnValue([]),
                    isNodeSelected: () => vi.fn()
                },
                actions: {
                    selectConnection: vi.fn(),
                    deselectConnection: vi.fn(),
                    deselectAllObjects: vi.fn()
                }
            }
        }, customStoreConfig);
    };

    describe('attached to a metanode', () => {
        it('uses portShift', () => {
            doShallowMount({ storeConfig: getStoreConfig() });
            expect(portShiftMock).toHaveBeenCalledWith(0, 2, true, true);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3, true, false);
        });

        it('draws a path between table ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            const wrapper = doShallowMount({ storeConfig: getStoreConfig() });
            expect(connectorPath).toHaveBeenCalledWith(38.5, 7.5, 7.5, 40.5);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('draws a path between other ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            const wrapper = doShallowMount({ storeConfig: getStoreConfig({ customPortMock: { type: 'foo' } }) });
            expect(connectorPath).toHaveBeenCalledWith(38.5, 7.5, 7.5, 40.5);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });
    });

    describe('attached to other node', () => {
        afterEach(() => {
            // connectorPath.mockReset();
            vi.clearAllMocks();
        });

        it('draws grab cursor by default', () => {
            const wrapper = doShallowMount({ storeConfig: getStoreConfig() });
            expect(wrapper.find('.read-only').exists()).toBe(false);
        });

        it('selects the connection', async () => {
            const storeConfig = getStoreConfig();
            const wrapper = doShallowMount({ storeConfig });
            await wrapper.find('g path').trigger('click', { button: 0 });

            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectConnection).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:2_2')
            );
        });

        it('right click selects the connection', async () => {
            const storeConfig = getStoreConfig();
            const wrapper = doShallowMount({ storeConfig });
            await wrapper.find('g path').trigger('pointerdown', { button: 2 });

            expect(storeConfig.application.actions.toggleContextMenu).toHaveBeenCalled();
            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectConnection).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:2_2')
            );
        });

        it('shift-click adds to selection', async () => {
            const storeConfig = getStoreConfig();
            const wrapper = doShallowMount({ storeConfig });
            await wrapper.find('g path').trigger('click', { button: 0, shiftKey: true });

            expect(storeConfig.selection.actions.deselectConnection).not.toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectConnection).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:2_2')
            );
        });

        it('shift-click and right click add to selection', async () => {
            const storeConfig = getStoreConfig();
            const wrapper = doShallowMount({ storeConfig });
            await wrapper.find('g path').trigger('pointerdown', { button: 2, shiftKey: true });

            expect(storeConfig.application.actions.toggleContextMenu).toHaveBeenCalled();
            expect(storeConfig.selection.actions.deselectConnection).not.toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectConnection).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:2_2')
            );
        });

        it('shift-click removes from selection', async () => {
            const storeConfig = getStoreConfig({
                customStoreConfig: {
                    selection: {
                        getters: {
                            isConnectionSelected: () => vi.fn().mockReturnValue(true)
                        }
                    }
                }
            });

            const wrapper = doShallowMount({ storeConfig });
            await wrapper.find('g path').trigger('click', { button: 0, shiftKey: true });

            expect(storeConfig.selection.actions.deselectConnection).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectConnection).not.toHaveBeenCalled();
        });

        it('draws no grab cursor if write protected', () => {
            const storeConfig = getStoreConfig({
                customStoreConfig: {
                    workflow: {
                        state: {
                            info: {
                                linked: true
                            }
                        },
                        getters: {
                            isWritable() {
                                return false;
                            }
                        }
                    }
                }
            });

            const wrapper = doShallowMount({ storeConfig });

            expect(wrapper.find('.read-only').exists()).toBe(true);
        });

        it('draws dashed lines when streaming', () => {
            const storeConfig = getStoreConfig({
                customStoreConfig: {
                    workflow: {
                        getters: {
                            isStreaming() {
                                return true;
                            }
                        }
                    }
                }
            });

            const wrapper = doShallowMount({ storeConfig, props: { ...defaultProps, streaming: true } });
            expect(wrapper.find('.dashed').exists()).toBe(true);
        });

        it('uses portShift', () => {
            const nodes = {
                'root:1': { kind: 'node' },
                'root:2': { kind: 'node' }
            };

            const storeConfig = getStoreConfig({
                customStoreConfig: {
                    workflow: {
                        state: {
                            activeWorkflow: { nodes }
                        }
                    }
                }
            });

            doShallowMount({ storeConfig });
            expect(portShiftMock).toHaveBeenCalledWith(0, 2, false, true);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3, false, false);
        });

        it('draws a path between table ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            const nodes = {
                'root:1': { kind: 'node', position: { x: 0, y: 0 } },
                'root:2': { kind: 'node', position: { x: 12, y: 14 } }
            };

            const storeConfig = getStoreConfig({
                customStoreConfig: {
                    workflow: {
                        state: {
                            activeWorkflow: { nodes }
                        }
                    }
                }
            });

            const wrapper = doShallowMount({ storeConfig });

            expect(connectorPath).toHaveBeenCalledWith(32, -4.5, 7.5, 40.5);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('draws a path between other ports', () => {
            const nodes = {
                'root:1': { kind: 'node', position: { x: 0, y: 0 } },
                'root:2': { kind: 'node', position: { x: 12, y: 14 } }
            };

            const storeConfig = getStoreConfig({
                customPortMock: { type: 'foo' },
                customStoreConfig: {
                    workflow: {
                        state: {
                            activeWorkflow: { nodes }
                        }
                    }
                }
            });

            connectorPath.mockReturnValueOnce('that path');
            const wrapper = doShallowMount({ storeConfig });

            expect(connectorPath).toHaveBeenCalledWith(32, -4.5, 7.5, 40.5);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('does not add any style classes for regular connections', () => {
            const wrapper = doShallowMount({ storeConfig: getStoreConfig() });
            const classes = wrapper.findAll('path')[1].classes();
            expect(classes.includes('highlighted')).toBe(false);
            expect(classes.includes('flow-variable')).toBe(false);
        });

        it('adds class for flow variable ports', () => {
            const wrapper = doShallowMount({
                storeConfig: getStoreConfig(),
                props: { ...defaultProps, flowVariableConnection: true }
            });

            const classes = wrapper.findAll('path')[1].classes();
            expect(classes.includes('flow-variable')).toBe(true);
        });

        it('highlights connection if source node is selected', () => {
            const storeConfig = getStoreConfig({
                customStoreConfig: {
                    selection: {
                        getters: {
                            singleSelectedNode: () => vi.fn(() => 'root:1'),
                            isNodeSelected: () => vi.fn(node => node === 'root:1')
                        }
                    }
                }
            });

            const wrapper = doShallowMount({ storeConfig });
            const classes = wrapper.findAll('path')[1].classes();
            expect(classes.includes('highlighted')).toBe(true);
        });

        it('highlights connection if destination node is selected', () => {
            const storeConfig = getStoreConfig({
                customStoreConfig: {
                    selection: {
                        getters: {
                            singleSelectedNode: () => vi.fn(() => 'root:2'),
                            isNodeSelected: () => vi.fn(node => node === 'root:2')
                        }
                    }
                }
            });

            const wrapper = doShallowMount({ storeConfig });
            const classes = wrapper.findAll('path')[1].classes();
            expect(classes.includes('highlighted')).toBe(true);
        });

        it('does not highlight connections if a connection is selected', () => {
            const storeConfig = getStoreConfig({
                customStoreConfig: {
                    selection: {
                        getters: {
                            singleSelectedNode: () => vi.fn(() => 'root:2'),
                            isNodeSelected: () => vi.fn(node => node === 'root:2'),
                            selectedConnections: vi.fn(() => ['conn'])
                        }
                    }
                }
            });

            const wrapper = doShallowMount({ storeConfig });
            const classes = wrapper.findAll('path')[1].classes();
            expect(classes.includes('highlighted')).toBe(false);
        });
    });

    describe('attached to port bars inside metanode', () => {
        const storeConfig = getStoreConfig({
            customStoreConfig: {
                workflow: {
                    state: {
                        activeWorkflow: {
                            projectId: 'some id',
                            nodes: Object.create({}),
                            metaInPorts: {
                                xPos: 100,
                                ports: [defaultPortMock]
                            },
                            metaOutPorts: {
                                xPos: 702,
                                ports: [defaultPortMock, defaultPortMock, defaultPortMock]
                            },
                            info: {}
                        }
                    },
                    getters: {
                        ...workflowStoreConfig.getters,
                        isWritable() {
                            return true;
                        },
                        isDragging() {
                            return false;
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
                        isConnectionSelected: () => vi.fn(),
                        singleSelectedNode: vi.fn(),
                        selectedConnections: vi.fn().mockReturnValue([]),
                        isNodeSelected: () => vi.fn()
                    }
                }
            }
        });

        afterEach(() => {
            connectorPath.mockReset();
        });

        it('draws a path between table ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            const wrapper = doShallowMount({ storeConfig });

            expect(connectorPath).toHaveBeenCalledWith(104.5, 651, 697.5, 960);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('draws a path between other ports', () => {
            connectorPath.mockReturnValueOnce('that path');
            const wrapper = doShallowMount({ storeConfig });

            expect(connectorPath).toHaveBeenCalledWith(104.5, 651, 697.5, 960);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });
    });

    describe('follows pointer', () => {
        const storeConfig = getStoreConfig({
            customStoreConfig: {
                workflow: {
                    state: {
                        activeWorkflow: {
                            nodes: Object.create({
                                'root:1': {
                                    kind: 'node',
                                    position: { x: 0, y: 0 },
                                    outPorts: [defaultPortMock, defaultPortMock]
                                },
                                'root:2': {
                                    kind: 'node',
                                    position: { x: 32, y: 0 },
                                    inPorts: [defaultPortMock, defaultPortMock]
                                }
                            })
                        }
                    }
                }
            }
        });

        afterEach(() => {
            connectorPath.mockReset();
        });

        it('draw connector forward', () => {
            const props = {
                sourceNode: 'root:1',
                sourcePort: 1,
                absolutePoint: [32, 16],
                allowedActions: {
                    canDelete: false
                },
                id: 'drag-connector'
            };
            connectorPath.mockReturnValueOnce('that path');
            const wrapper = doShallowMount({ storeConfig, props });

            expect(connectorPath).toHaveBeenCalledWith(36.5, 16, 32, 16);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });

        it('draw connector backwards', () => {
            const props = {
                destNode: 'root:2',
                destPort: 1,
                absolutePoint: [0, 16],
                allowedActions: {
                    canDelete: false
                },
                id: 'drag-connector'
            };
            connectorPath.mockReturnValueOnce('that path');
            const wrapper = doShallowMount({ storeConfig, props });

            expect(connectorPath).toHaveBeenCalledWith(0, 16, 27.5, 16);
            expect(wrapper.find('path').attributes().d).toBe('that path');
        });
    });

    describe('indicates being replaced', () => {
        const storeConfig = getStoreConfig({
            customStoreConfig: {
                workflow: {
                    state: {
                        activeWorkflow: {
                            nodes: Object.create({
                                'root:1': {
                                    kind: 'node',
                                    position: { x: 0, y: 0 },
                                    outPorts: [defaultPortMock, defaultPortMock]
                                },
                                'root:2': {
                                    kind: 'node',
                                    position: { x: 12, y: 14 },
                                    inPorts: [defaultPortMock, defaultPortMock, defaultPortMock]
                                }
                            })
                        }
                    }
                }
            }
        });

        beforeEach(() => {
            gsap.to.mockReset();
        });

        it('snaps away', async () => {
            connectorPath.mockReturnValueOnce('original path');
            const wrapper = doShallowMount({ storeConfig });

            expect(wrapper.vm.suggestDelete).toBeFalsy();

            wrapper.trigger('indicate-replacement', { detail: { state: true } });
            connectorPath.mockReturnValueOnce('shifted path');
            await Vue.nextTick();

            expect(wrapper.vm.suggestDelete).toBeTruthy();

            // watcher for suggestDelete
            let path = wrapper.find('path:not(.hover-area)').element;

            expect(gsap.to).toHaveBeenCalledTimes(1);
            expect(gsap.to).toHaveBeenCalledWith(path, {
                attr: { d: 'shifted path' },
                duration: 0.2,
                ease: 'power2.out'
            });
        });

        it('snaps back', async () => {
            connectorPath.mockReturnValueOnce('original path');
            const wrapper = doShallowMount({ storeConfig });

            wrapper.trigger('indicate-replacement', { detail: { state: true } });
            connectorPath.mockReturnValueOnce('shifted path');
            await Vue.nextTick();

            wrapper.trigger('indicate-replacement', { detail: { state: false } });
            await Vue.nextTick();

            expect(wrapper.vm.suggestDelete).toBeFalsy();

            // watcher for suggestDelete
            let path = wrapper.find('path:not(.hover-area)').element;

            expect(gsap.to).toHaveBeenCalledTimes(2);
            expect(gsap.to).toHaveBeenCalledWith(path, {
                attr: { d: 'original path' },
                duration: 0.2,
                ease: 'power2.out'
            });
        });

        it("doesn't snap back when deleted", async () => {
            const wrapper = doShallowMount({ storeConfig });

            wrapper.trigger('indicate-replacement', { detail: { state: true } });
            await Vue.nextTick();

            wrapper.vm.$root.$emit('connector-dropped');
            await Vue.nextTick();

            wrapper.trigger('indicate-replacement', { detail: { state: false } });
            await Vue.nextTick();

            // TODO: NXT-954 enable locking again if know when the node will be really removed (only backend knows)
            // expect(wrapper.vm.suggestDelete).toBeTruthy();

            // expect(gsap.to).toHaveBeenCalledTimes(1);
        });

        it("can't lock after snapping back", async () => {
            const wrapper = doShallowMount({ storeConfig });

            wrapper.trigger('indicate-replacement', { detail: { state: true } });
            await Vue.nextTick();

            wrapper.trigger('indicate-replacement', { detail: { state: false } });
            await Vue.nextTick();

            wrapper.vm.$root.$emit('connector-dropped');
            await Vue.nextTick();

            expect(wrapper.vm.suggestDelete).toBeFalsy();

            wrapper.trigger('indicate-replacement', { detail: { state: true } });
            await Vue.nextTick();

            expect(wrapper.vm.suggestDelete).toBeTruthy();
        });
    });
});
