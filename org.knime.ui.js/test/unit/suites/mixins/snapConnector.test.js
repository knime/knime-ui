/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import { snapConnector } from '~/mixins';

let snapContainerConfig,
    doMount,
    connectNodesMock,
    snapContainerComponent,
    wrapper;

describe('Snap Connector Mixin', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        Event.prototype.preventDefault = jest.fn();
        snapContainerConfig = {
            position: {
                x: 5,
                y: 5
            },
            portPositions: {
                in: [
                    [0, -5],
                    [0, 5],
                    [0, 15]
                ],
                out: [
                    [30, -5],
                    [30, 5],
                    [30, 15]
                ]
            },
            isOutsideConnectorHoverRegion: jest.fn().mockReturnValue(false),
            id: undefined,
            containerId: undefined
        };

        connectNodesMock = jest.fn();

        doMount = () => {
            snapContainerComponent = {
                template: `
                <div
                    @connector-enter.stop="onConnectorEnter"
                    @connector-leave.stop="onConnectorLeave"
                    @connector-move.stop="onConnectorMove"
                    @connector-drop.stop="onConnectorDrop"
                />`,
                mixins: [snapConnector],
                computed: {
                    position: () => snapContainerConfig.position,
                    portPositions: () => snapContainerConfig.portPositions,
                    isOutsideConnectorHoverRegion: () => snapContainerConfig.isOutsideConnectorHoverRegion,
                    id: () => snapContainerConfig.id,
                    containerId: () => snapContainerConfig.containerId
                }
            };

            let $store = mockVuexStore({
                workflow: {
                    actions: {
                        connectNodes: connectNodesMock
                    },
                    state: {
                        activeWorkflow: {
                            connections: {
                                // eslint-disable-next-line quote-props
                                'existing': {
                                    sourceNode: 'existing:1',
                                    destNode: 'existing:2',
                                    sourcePort: 0,
                                    destPort: 0
                                }
                            }
                        }
                    }
                }
            });
            wrapper = shallowMount(snapContainerComponent, { mocks: { $store } });
        };
    });

    describe('connector enter & leave', () => {
        test('connector hover state for legal target', () => {
            doMount();
            expect(wrapper.vm.connectorHover).toBe(false);

            wrapper.trigger('connector-enter');
            expect(Event.prototype.preventDefault).toHaveBeenCalled();
            expect(wrapper.vm.connectorHover).toBe(true);

            wrapper.trigger('connector-leave');
            expect(wrapper.vm.connectorHover).toBe(false);
        });

        test('connector enter for illegal target', () => {
            doMount();
            wrapper.setData({ connectionForbidden: true });

            wrapper.trigger('connector-enter');
            expect(Event.prototype.preventDefault).not.toHaveBeenCalled();
            expect(wrapper.vm.connectorHover).toBe(false);
        });
    });

    describe('Is legal drop target?', () => {
        test('illegal', () => {
            doMount();

            wrapper.vm.$root.$emit('connector-start', {
                compatibleNodes: new Set(),
                nodeId: 'notThisNode'
            });

            expect(wrapper.vm.connectionForbidden).toBe(true);
            expect(wrapper.vm.isConnectionSource).toBe(false);
        });

        test('illegal and is connection source', () => {
            snapContainerConfig.id = 'node-id';
            doMount();

            wrapper.vm.$root.$emit('connector-start', {
                compatibleNodes: new Set(),
                nodeId: 'node-id'
            });

            expect(wrapper.vm.connectionForbidden).toBe(true);
            expect(wrapper.vm.isConnectionSource).toBe(true);
        });

        test('legal', () => {
            snapContainerConfig.id = 'node-id';
            doMount();

            wrapper.vm.$root.$emit('connector-start', {
                compatibleNodes: new Set(['node-id']),
                nodeId: 'node-id'
            });

            expect(wrapper.vm.connectionForbidden).toBe(false);
        });

        test('special case for metanodes', () => {
            snapContainerConfig.containerId = 'root';
            doMount();

            wrapper.vm.$root.$emit('connector-start', {
                compatibleNodes: new Set()
            });

            expect(wrapper.vm.connectionForbidden).toBe(false);
            expect(wrapper.vm.isConnectionSource).toBe(false);
        });

        test('connector-end resets state', () => {
            doMount();
            wrapper.setData({
                connectionForbidden: true,
                isConnectionSource: true
            });

            wrapper.vm.$root.$emit('connector-end');

            expect(wrapper.vm.connectionForbidden).toBe(false);
            expect(wrapper.vm.isConnectionSource).toBe(false);
        });
    });

    describe('Make partitions', () => {
        test('no port list', () => {
            snapContainerConfig.portPositions = {};
            doMount();

            expect(wrapper.vm.snapPartitions).toStrictEqual({});
        });

        test('no ports', () => {
            snapContainerConfig.portPositions = {
                in: [],
                out: []
            };
            doMount();

            expect(wrapper.vm.snapPartitions).toStrictEqual({
                in: null,
                out: null
            });
        });

        test('one port', () => {
            snapContainerConfig.portPositions = {
                in: [[0, 0]],
                out: [[30, 0]]
            };
            doMount();

            expect(wrapper.vm.snapPartitions).toStrictEqual({
                in: [],
                out: []
            });
        });

        test('multiple ports', () => {
            doMount();

            expect(wrapper.vm.snapPartitions).toStrictEqual({
                in: [0, 10],
                out: [0, 10]
            });
        });
    });

    describe.each([
        ['in', 0],
        ['out', 30]
    ])('Snap to %s-Ports', (targetPortDirection, portX) => {
        test('no ports', () => {
            snapContainerConfig.portPositions = {
                in: [],
                out: []
            };

            doMount();

            let overwritePositionMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: -1,
                    x: -1,
                    targetPortDirection,
                    overwritePosition: overwritePositionMock
                }
            });

            expect(overwritePositionMock).not.toHaveBeenCalled();
            expect(wrapper.vm.targetPort).toBeFalsy();
        });

        test('one port', () => {
            snapContainerConfig.portPositions = {
                in: [[0, 0]],
                out: [[30, 0]]
            };

            doMount();

            let overwritePositionMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: -1,
                    x: -1,
                    targetPortDirection,
                    overwritePosition: overwritePositionMock
                }
            });

            expect(overwritePositionMock).toHaveBeenCalledWith([portX + 5, 0 + 5]);
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 0
            });
        });

        test('one port, but outside of hover boundaries', () => {
            snapContainerConfig.portPositions = {
                in: [[0, 0]],
                out: [[30, 0]]
            };
            snapContainerConfig.isOutsideConnectorHoverRegion.mockReturnValue(true);

            doMount();

            let overwritePositionMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: -1,
                    x: -1,
                    targetPortDirection,
                    overwritePosition: overwritePositionMock
                }
            });

            expect(overwritePositionMock).not.toHaveBeenCalled();
            expect(wrapper.vm.targetPort).toBeFalsy();
        });

        test('3 ports', () => {
            snapContainerConfig.position = { x: 0, y: 0 };
            doMount();

            // above first port => port 0
            let overwritePositionMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: -10,
                    x: -1,
                    targetPortDirection,
                    overwritePosition: overwritePositionMock
                }
            });

            expect(overwritePositionMock).toHaveBeenCalledWith([portX, -5]);
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 0
            });

            // above / still at first boundary => port 0
            overwritePositionMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: 0,
                    x: -1,
                    targetPortDirection,
                    overwritePosition: overwritePositionMock
                }
            });

            expect(overwritePositionMock).toHaveBeenCalledWith([portX, -5]);
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 0
            });

            // below first boundary => port 1
            overwritePositionMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: 1,
                    x: -1,
                    targetPortDirection,
                    overwritePosition: overwritePositionMock
                }
            });

            expect(overwritePositionMock).toHaveBeenCalledWith([portX, 5]);
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 1
            });

            // above / still at second boundary => port 1
            overwritePositionMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: 10,
                    x: -1,
                    targetPortDirection,
                    overwritePosition: overwritePositionMock
                }
            });

            expect(overwritePositionMock).toHaveBeenCalledWith([portX, 5]);
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 1
            });

            // below last boundary => port 2
            overwritePositionMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: 11,
                    x: -1,
                    targetPortDirection,
                    overwritePosition: overwritePositionMock
                }
            });

            expect(overwritePositionMock).toHaveBeenCalledWith([portX, 15]);
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 2
            });
        });
    });

    describe.each(['id', 'containerId'])('Drop Connector (%s)', (snapContainerIdProperty) => {
        beforeEach(() => {
            snapContainerConfig[snapContainerIdProperty] = 'container:1';
        });

        test('no target port', () => {
            doMount();
            wrapper.trigger('connector-drop');

            expect(connectNodesMock).not.toHaveBeenCalled();
        });

        test('forward connection', () => {
            doMount();
            wrapper.vm.targetPort = {
                index: 1,
                side: 'in'
            };

            wrapper.trigger('connector-drop', {
                detail: {
                    sourceNode: 'source',
                    sourcePort: 0
                }
            });
            expect(connectNodesMock).toHaveBeenCalledWith(expect.anything(), {
                sourceNode: 'source',
                sourcePort: 0,
                destNode: 'container:1',
                destPort: 1
            });
        });

        test('backwards connection', () => {
            doMount();
            wrapper.vm.targetPort = {
                index: 1,
                side: 'out'
            };

            wrapper.trigger('connector-drop', {
                detail: {
                    destNode: 'destination',
                    destPort: 0
                }
            });
            expect(connectNodesMock).toHaveBeenCalledWith(expect.anything(), {
                destNode: 'destination',
                destPort: 0,
                sourceNode: 'container:1',
                sourcePort: 1
            });
        });
    });

    test("Doesn't reconnect existing connection", () => {
        snapContainerConfig.id = 'existing:2';
        doMount();

        wrapper.vm.targetPort = {
            index: 0,
            side: 'in'
        };

        wrapper.trigger('connector-drop', {
            detail: {
                sourceNode: 'existing:1',
                sourcePort: 0
            }
        });
        expect(connectNodesMock).not.toHaveBeenCalled();
    });
});
