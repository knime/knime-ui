import * as Vue from 'vue';

import { mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';
import * as $shapes from '@/style/shapes.mjs';
import { $bus } from '@/plugins/event-bus';

import ConnectorSnappingProvider from '../ConnectorSnappingProvider.vue';

describe('ConnectorSnappingProvider.vue', () => {
    Event.prototype.preventDefault = jest.fn();
    const connectNodesMock = jest.fn();
    const mockPorts = {
        inPorts: [...Array(3).keys()].map((_, idx) => ({ id: `port-${idx + 1}` })),
        outPorts: [...Array(3).keys()].map((_, idx) => ({ id: `port-${idx + 1}` }))
    };

    const portPositions = {
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
    };

    const defaultProps = {
        id: 'root',
        disableValidTargetCheck: false,
        position: {
            x: 5,
            y: 5
        },
        portPositions
    };

    const doMount = (customProps = {}) => {
        const componentInSlot = `<div
            id="slotted-component"
            :connection-forbidden="scope.connectionForbidden"
            :isConnectionSource="scope.isConnectionSource"
            :targetPort="scope.targetPort"
            :connector-hover="scope.connectorHover"
            @connector-enter.stop="scope.on.onConnectorEnter"
            @connector-leave.stop="scope.on.onConnectorLeave"
            @connector-move.stop="scope.on.onConnectorMove($event, mockPorts)"
            @connector-drop.stop="scope.on.onConnectorDrop"
        ></div>`;

        const getScopedComponent = {
            name: 'SlottedChild',
            template: componentInSlot,
            props: {
                scope: {
                    type: Object,
                    required: true
                }
            },
            data() {
                return { mockPorts };
            }
        };

        const $store = mockVuexStore({
            workflow: {
                actions: {
                    connectNodes: connectNodesMock
                }
            }
        });

        return mount(ConnectorSnappingProvider, {
            props: { ...defaultProps, ...customProps },
            global: {
                plugins: [$store],
                mocks: { mockPorts, $shapes, $bus }
            },
            slots: {
                default: (props) => Vue.h(getScopedComponent, { scope: props })
            }
        });
    };

    const getSlottedChildComponent = (wrapper) => wrapper.findComponent({ name: 'SlottedChild' });

    // eslint-disable-next-line arrow-body-style
    const getSlottedStubProp = ({ wrapper, propName }) => {
        // access the `scope` prop of the dummy slotted component and get value that was injected by
        // ConnectorSnappingProvider via the slot props
        return getSlottedChildComponent(wrapper).props('scope')[propName];
    };

    const startConnection = async ({ wrapper, startNodeId = '', validConnectionTargets = [] }) => {
        $bus.emit('connector-start', {
            startNodeId,
            validConnectionTargets: new Set(validConnectionTargets)
        });
        await Vue.nextTick();
    };

    const connectorEnter = async ({ wrapper }) => {
        getSlottedChildComponent(wrapper).trigger('connector-enter');
        await Vue.nextTick();
    };
    
    const connectorMove = async ({
        wrapper,
        ports = mockPorts,
        eventDetails = { x: 0, y: 0, targetPortDirection: 'in' },
        onSnapCallback = jest.fn(() => true)
    }) => {
        getSlottedChildComponent(wrapper).trigger('connector-move', {
            detail: { ...eventDetails, onSnapCallback }
        }, ports);
        await Vue.nextTick();
    };
    
    const connectorLeave = async ({ wrapper }) => {
        getSlottedChildComponent(wrapper).trigger('connector-leave');
        await Vue.nextTick();
    };
    
    const connectorEnd = async ({ wrapper }) => {
        $bus.emit('connector-end');
        await Vue.nextTick();
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('connector enter & leave', () => {
        it('should set the connector hover state for valid target', async () => {
            const myId = 'target';
            const wrapper = doMount({ id: myId });
            
            // start connection to a valid target
            await startConnection({ wrapper, startNodeId: 'start', validConnectionTargets: [myId] });

            expect(getSlottedStubProp({ wrapper, propName: 'connectorHover' })).toBeFalsy();
            
            // hover state is set when connector enters
            await connectorEnter({ wrapper });
            expect(getSlottedStubProp({ wrapper, propName: 'connectorHover' })).toBe(true);
            expect(Event.prototype.preventDefault).toHaveBeenCalled();

            // hover state is removed when connector leaves
            await connectorLeave({ wrapper });
            expect(getSlottedStubProp({ wrapper, propName: 'connectorHover' })).toBeFalsy();
        });

        it('should ignore connector enter for invalid targets', async () => {
            const myId = 'target';
            const wrapper = doMount({ id: myId });
            
            // start connection to an invalid target
            await startConnection({
                wrapper,
                startNodeId: 'start',
                validConnectionTargets: ['a-different-id-other-than-mine']
            });

            // hover state remains unchanged when connector enters
            await connectorEnter({ wrapper });
            expect(getSlottedStubProp({ wrapper, propName: 'connectorHover' })).toBeFalsy();
            expect(Event.prototype.preventDefault).not.toHaveBeenCalled();
            expect(getSlottedStubProp({ wrapper, propName: 'connectionForbidden' })).toBe(true);
        });
    });

    describe('Validates drop targets', () => {
        it('should not allow connection to self', async () => {
            const myId = 'self';
            const wrapper = doMount({ id: myId });
    
            await startConnection({ wrapper, startNodeId: myId });

            expect(getSlottedStubProp({ wrapper, propName: 'connectionForbidden' })).toBe(true);
            expect(getSlottedStubProp({ wrapper, propName: 'isConnectionSource' })).toBe(true);
        });
    
        it('should skip checking for valid targets when the prop is set', async () => {
            const myId = 'my-id';
            const wrapper = doMount({ id: myId, disableValidTargetCheck: true });
    
            await startConnection({ wrapper, startNodeId: 'start', validConnectionTargets: ['other-id'] });
    
            expect(getSlottedStubProp({ wrapper, propName: 'connectionForbidden' })).toBeFalsy();
        });
    
        it('should reset the state when the connector-end event is received', async () => {
            const myId = 'my-id';
            const wrapper = doMount({ id: myId });
            
            await startConnection({ wrapper, startNodeId: 'start', validConnectionTargets: [myId] });
            await connectorEnter({ wrapper });
            await connectorEnd({ wrapper });

            expect(getSlottedStubProp({ wrapper, propName: 'connector-hover' })).toBeFalsy();
            expect(getSlottedStubProp({ wrapper, propName: 'isConnectionSource' })).toBeFalsy();
            expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toBeFalsy();
            expect(getSlottedStubProp({ wrapper, propName: 'connectionForbidden' })).toBeFalsy();
        });
    });

    describe('Snapping', () => {
        const onSnapCallback = jest.fn(() => true);

        it('should not snap when no portPositions are given', async () => {
            const wrapper = doMount({ portPositions: { in: [], out: [] } });

            await startConnection({ wrapper, startNodeId: 'start', validConnectionTargets: ['root'] });

            await connectorMove({ wrapper, onSnapCallback });

            expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toBeNull();
            expect(onSnapCallback).not.toHaveBeenCalled();
        });

        it('should snap to the correct port when multiple are given', async () => {
            const wrapper = doMount();

            await connectorMove({
                wrapper,
                eventDetails: { x: 0, y: 8, targetPortDirection: 'in' },
                onSnapCallback
            });

            expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toStrictEqual({ index: 1, side: 'in' });
            expect(onSnapCallback).toHaveBeenCalledWith({
                targetPort: mockPorts.inPorts[1],
                snapPosition: [5, 10]
            });
        });

        it('should not snap if the onSnapCallback returns falsy', async () => {
            const wrapper = doMount();

            await connectorMove({
                wrapper,
                eventDetails: { x: 0, y: 8, targetPortDirection: 'in' },
                onSnapCallback: onSnapCallback.mockReturnValueOnce(false)
            });

            expect(onSnapCallback).toHaveBeenCalled();
            expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toBeNull();
        });

        describe('Snap to Ports', () => {
            it.each([
                ['in', { x: 38, y: 0 }],
                ['out', { x: -10, y: 5 }]
            ])(
                'should not snap to an %sPort port outside of hover boundaries',
                async (targetPortDirection, mouseCoords) => {
                    const wrapper = doMount({ portPositions: {
                        in: [[0, 0]],
                        out: [[30, 0]]
                    } });
    
                    await connectorMove({ wrapper, eventDetails: { ...mouseCoords, targetPortDirection } });
    
                    expect(onSnapCallback).not.toHaveBeenCalled();
                    expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toBeNull();
                }
            );

            it.each([
                ['in', { x: 0, y: 0 }],
                ['out', { x: 38, y: 5 }]
            ])('should snap to %sPorts a single given port', async (targetPortDirection, mouseCoords) => {
                const position = { x: 5, y: 5 };
                const portPositions = {
                    in: [[0, 0]],
                    out: [[30, 0]]
                };

                const wrapper = doMount({ position, portPositions });

                const [x, y] = portPositions[targetPortDirection][0];
    
                await connectorMove({
                    wrapper,
                    onSnapCallback,
                    eventDetails: { ...mouseCoords, targetPortDirection }
                });
    
                expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toStrictEqual({
                    index: 0,
                    side: targetPortDirection
                });
                
                expect(onSnapCallback).toHaveBeenCalledWith({
                    snapPosition: [x + position.x, y + position.y],
                    targetPort: { id: 'port-1' }
                });
            });

            describe.each([
                ['in'],
                ['out']
            ])('3 ports', (targetPortDirection) => {
                it(`should snap to first ${targetPortDirection}-port`, async () => {
                    const position = { x: 0, y: 0 };
                    const wrapper = doMount({ position, disableHoverBoundaryCheck: true });
                    
                    const expectedIndex = 0;
                    // above first port => port 0
                    await connectorMove({
                        wrapper,
                        eventDetails: { x: -1, y: -10, targetPortDirection },
                        onSnapCallback
                    });

                    const [snapX, snapY] = portPositions[targetPortDirection][expectedIndex];

                    expect(onSnapCallback).toHaveBeenCalledWith({
                        snapPosition: [snapX, snapY],
                        targetPort: { id: 'port-1' }
                    });

                    expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toStrictEqual({
                        side: targetPortDirection,
                        index: 0
                    });

                    // above / still at first boundary => port 0
                    await connectorMove({
                        wrapper,
                        eventDetails: { x: -1, y: 0, targetPortDirection },
                        onSnapCallback
                    });
    
                    expect(onSnapCallback).toHaveBeenCalledWith({
                        snapPosition: [snapX, snapY],
                        targetPort: { id: 'port-1' }
                    });

                    expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toStrictEqual({
                        side: targetPortDirection,
                        index: 0
                    });
                });

                it(`should snap to second ${targetPortDirection}-port`, async () => {
                    const position = { x: 0, y: 0 };
                    const wrapper = doMount({ position, disableHoverBoundaryCheck: true });
                    
                    const expectedIndex = 1;
                    const [snapX, snapY] = portPositions[targetPortDirection][expectedIndex];

                    // below first boundary => port 1
                    await connectorMove({
                        wrapper,
                        eventDetails: { x: -1, y: 1, targetPortDirection },
                        onSnapCallback
                    });
    
                    expect(onSnapCallback).toHaveBeenCalledWith({
                        snapPosition: [snapX, snapY],
                        targetPort: { id: 'port-2' }
                    });

                    expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toStrictEqual({
                        side: targetPortDirection,
                        index: expectedIndex
                    });
    
                    // above / still at second boundary => port 1
                    await connectorMove({
                        wrapper,
                        eventDetails: { x: -1, y: 10, targetPortDirection },
                        onSnapCallback
                    });
    
                    expect(onSnapCallback).toHaveBeenCalledWith({
                        snapPosition: [snapX, snapY],
                        targetPort: { id: 'port-2' }
                    });
                    expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toStrictEqual({
                        side: targetPortDirection,
                        index: expectedIndex
                    });
                });

                it(`should snap to third ${targetPortDirection}-port`, async () => {
                    const position = { x: 0, y: 0 };
                    const wrapper = doMount({ position, disableHoverBoundaryCheck: true });
                    
                    const expectedIndex = 2;
                    const [snapX, snapY] = portPositions[targetPortDirection][expectedIndex];
    
                    // below last boundary => port 2
                    await connectorMove({
                        wrapper,
                        eventDetails: { x: -1, y: 11, targetPortDirection },
                        onSnapCallback
                    });
    
                    expect(onSnapCallback).toHaveBeenCalledWith({
                        snapPosition: [snapX, snapY],
                        targetPort: { id: 'port-3' }
                    });

                    expect(getSlottedStubProp({ wrapper, propName: 'targetPort' })).toStrictEqual({
                        side: targetPortDirection,
                        index: expectedIndex
                    });
                });
            });
        });
    });
});
