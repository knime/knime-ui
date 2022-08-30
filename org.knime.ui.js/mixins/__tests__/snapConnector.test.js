/* eslint-disable no-magic-numbers */
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/unit/test-utils';

import { snapConnector } from '../snapConnector';

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
                    @connector-move.stop="onConnectorMove($event, mockPorts)"
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
                    }
                }
            });
            const mockPorts = {
                inPorts: [...Array(3).keys()].map((_, idx) => ({ id: `port-${idx + 1}` })),
                outPorts: [...Array(3).keys()].map((_, idx) => ({ id: `port-${idx + 1}` }))
            };
            wrapper = shallowMount(snapContainerComponent, { mocks: { $store, mockPorts } });
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

            let snapCallbackMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: -1,
                    x: -1,
                    targetPortDirection,
                    onSnapCallback: snapCallbackMock
                }
            });

            expect(snapCallbackMock).not.toHaveBeenCalled();
            expect(wrapper.vm.targetPort).toBeFalsy();
        });

        test('one port', () => {
            snapContainerConfig.portPositions = {
                in: [[0, 0]],
                out: [[30, 0]]
            };

            doMount();

            let snapCallbackMockMock = jest.fn(() => true);
            wrapper.trigger('connector-move', {
                detail: {
                    y: -1,
                    x: -1,
                    targetPortDirection,
                    onSnapCallback: snapCallbackMockMock
                }
            });

            expect(snapCallbackMockMock).toHaveBeenCalledWith({
                snapPosition: [portX + 5, 0 + 5],
                targetPort: { id: 'port-1' }
            });

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

            let snapCallbackMock = jest.fn();
            wrapper.trigger('connector-move', {
                detail: {
                    y: -1,
                    x: -1,
                    targetPortDirection,
                    onSnapCallback: snapCallbackMock
                }
            });

            expect(snapCallbackMock).not.toHaveBeenCalled();
            expect(wrapper.vm.targetPort).toBeFalsy();
        });

        test('3 ports', () => {
            snapContainerConfig.position = { x: 0, y: 0 };
            doMount();

            // above first port => port 0
            let snapCallbackMock = jest.fn(() => true);
            wrapper.trigger('connector-move', {
                detail: {
                    y: -10,
                    x: -1,
                    targetPortDirection,
                    onSnapCallback: snapCallbackMock
                }
            });

            expect(snapCallbackMock).toHaveBeenCalledWith({
                snapPosition: [portX, -5],
                targetPort: { id: 'port-1' }
            });
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 0
            });

            // above / still at first boundary => port 0
            snapCallbackMock = jest.fn(() => true);
            wrapper.trigger('connector-move', {
                detail: {
                    y: 0,
                    x: -1,
                    targetPortDirection,
                    onSnapCallback: snapCallbackMock
                }
            });

            expect(snapCallbackMock).toHaveBeenCalledWith({
                snapPosition: [portX, -5],
                targetPort: { id: 'port-1' }
            });
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 0
            });

            // below first boundary => port 1
            snapCallbackMock = jest.fn(() => true);
            wrapper.trigger('connector-move', {
                detail: {
                    y: 1,
                    x: -1,
                    targetPortDirection,
                    onSnapCallback: snapCallbackMock
                }
            });

            expect(snapCallbackMock).toHaveBeenCalledWith({
                snapPosition: [portX, 5],
                targetPort: { id: 'port-2' }
            });
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 1
            });

            // above / still at second boundary => port 1
            snapCallbackMock = jest.fn(() => true);
            wrapper.trigger('connector-move', {
                detail: {
                    y: 10,
                    x: -1,
                    targetPortDirection,
                    onSnapCallback: snapCallbackMock
                }
            });

            expect(snapCallbackMock).toHaveBeenCalledWith({
                snapPosition: [portX, 5],
                targetPort: { id: 'port-2' }
            });
            expect(wrapper.vm.targetPort).toStrictEqual({
                side: targetPortDirection,
                index: 1
            });

            // below last boundary => port 2
            snapCallbackMock = jest.fn(() => true);
            wrapper.trigger('connector-move', {
                detail: {
                    y: 11,
                    x: -1,
                    targetPortDirection,
                    onSnapCallback: snapCallbackMock
                }
            });

            expect(snapCallbackMock).toHaveBeenCalledWith({
                snapPosition: [portX, 15],
                targetPort: { id: 'port-3' }
            });
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
                    sourcePort: 0,
                    isCompatible: true
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
                    destPort: 0,
                    isCompatible: true
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
