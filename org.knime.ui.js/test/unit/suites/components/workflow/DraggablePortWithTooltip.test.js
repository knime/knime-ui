/* eslint-disable no-magic-numbers */

import { createLocalVue, shallowMount, createWrapper } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import DraggablePortWithTooltip from '~/components/workflow/DraggablePortWithTooltip';
import PortWithTooltip from '~/components/workflow/PortWithTooltip';
import Port from '~/components/workflow/Port';
import Connector from '~/components/workflow/Connector';
import Vue from 'vue';
import { circleDetection } from '~/util/compatibleConnections';

jest.mock('raf-throttle', () => function (func) {
    return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
    };
});
jest.mock('~/util/compatibleConnections', () => ({
    circleDetection: jest.fn().mockReturnValue([])
}));

describe('DraggablePortWithTooltip', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let propsData, $store, doShallowMount, storeConfig, wrapper, isWritable;

    beforeEach(() => {
        propsData = {
            direction: 'in',
            nodeId: 'node:1',
            relativePosition: [16, 32],
            port: {
                connectedVia: [],
                type: 'port',
                inactive: false,
                index: 0
            }
        };
        isWritable = true;
        storeConfig = {
            workflow: {
                actions: {
                    connectNodes: jest.fn()
                },
                state: {
                    activeWorkflow: 'workflowRef'
                },
                getters: {
                    isWritable() {
                        return isWritable;
                    }
                }
            },
            canvas: {
                getters: {
                    toCanvasCoordinates: () => x => x
                }
            }
        };

        doShallowMount = () => {
            $store = mockVuexStore(storeConfig);
            let mocks = { $store };
            wrapper = shallowMount(DraggablePortWithTooltip, { propsData, mocks });
        };
    });

    it('renders base case', () => {
        doShallowMount();

        expect(wrapper.attributes('class')).not.toMatch('targeted');
        expect(wrapper.attributes('transform')).toBe('translate(16,32)');

        let port = wrapper.findComponent(PortWithTooltip);
        expect(port.exists()).toBe(true);
        expect(port.props('port')).toStrictEqual(propsData.port);
        expect(port.props('tooltipPosition')).toStrictEqual(propsData.relativePosition);

        expect(wrapper.findComponent(Connector).exists()).toBe(false);
        expect(wrapper.findComponent(Port).exists()).toBe(false);
    });

    describe('indicate in-coming connector replacement', () => {
        let incomingConnector;

        beforeEach(() => {
            propsData.direction = 'in';
            propsData.port.connectedVia = ['incoming-connector'];
            incomingConnector = document.createElement('div');
            incomingConnector.setAttribute('data-connector-id', 'incoming-connector');
            incomingConnector.addEventListener('indicate-replacement', (e) => {
                incomingConnector._indicateReplacementEvent = e;
            });
            document.body.appendChild(incomingConnector);
        });

        test('targeting port sends events to connector', async () => {
            doShallowMount();

            wrapper.setProps({ targeted: true });
            await Vue.nextTick();

            expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
                state: true
            });

            // revert

            wrapper.setProps({ targeted: false });
            await Vue.nextTick();

            expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
                state: false
            });
        });

        test('dragging a connector', async () => {
            // for simplicity this test directly sets 'dragConnector' instead of using startDragging
            doShallowMount();

            wrapper.setData({
                dragConnector: {
                    id: 'mock-connector',
                    allowedActions: {},
                    content: 'a new in-coming connection'
                }
            });
            await Vue.nextTick();

            expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
                state: true
            });

            // revert

            wrapper.setData({ dragConnector: null });
            await Vue.nextTick();

            expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
                state: false
            });
        });

        test("doesn't do it for out-going ports", async () => {
            propsData.direction = 'out';
            doShallowMount();

            wrapper.setProps({ targeted: true });
            wrapper.setData({
                dragConnector: {
                    id: 'mock-connector',
                    allowedActions: {},
                    content: 'a new in-coming connection'
                }
            });
            await Vue.nextTick();

            expect(incomingConnector._indicateReplacementEvent).toBeFalsy();
        });

        test("doesn't do it for unconnected ports", async () => {
            propsData.port.connectedVia = [];
            doShallowMount();

            wrapper.setProps({ targeted: true });
            wrapper.setData({
                dragConnector: {
                    id: 'mock-connector',
                    allowedActions: {},
                    content: 'a new in-coming connection'
                }
            });
            await Vue.nextTick();

            expect(incomingConnector._indicateReplacementEvent).toBeFalsy();
        });
    });

    describe('Drop Connector', () => {
        test('highlight drop target on hover', async () => {
            doShallowMount();

            expect(wrapper.attributes().class).not.toMatch('targeted');

            wrapper.setProps({ targeted: true });
            await Vue.nextTick();

            expect(wrapper.attributes().class).toMatch('targeted');

            wrapper.setProps({ targeted: false });
            await Vue.nextTick();

            expect(wrapper.attributes().class).not.toMatch('targeted');
        });
    });

    describe('Drag Connector', () => {
        let startDragging, dragAboveTarget, KanvasMock, dropOnTarget;

        beforeEach(() => {
            // Set up
            KanvasMock = {
                offsetLeft: 8,
                offsetTop: 8,
                scrollLeft: 16,
                scrollTop: 16
            };

            startDragging = ([x, y] = [0, 0]) => {
                doShallowMount();

                document.getElementById = jest.fn().mockReturnValue(KanvasMock);

                wrapper.element.setPointerCapture = jest.fn();
                wrapper.element.releasePointerCapture = jest.fn();

                // Start dragging
                wrapper.trigger('pointerdown', { pointerId: -1, x, y, button: 0 });
            };

            dragAboveTarget = (targetElement, [x, y] = [0, 0], enableDropTarget = true) => {
                document.elementFromPoint = jest.fn().mockReturnValueOnce(targetElement);

                if (targetElement) {
                    targetElement.addEventListener('connector-enter', e => {
                        targetElement._connectorEnterEvent = e;
                        if (enableDropTarget) {
                            e.preventDefault();
                        }
                    });
                    targetElement.addEventListener('connector-move', e => {
                        targetElement._connectorMoveEvent = e;
                    });
                    targetElement.addEventListener('connector-leave', e => {
                        targetElement._connectorLeaveEvent = e;
                    });
                    targetElement.addEventListener('connector-drop', e => {
                        targetElement._connectorDropEvent = e;
                    });
                }

                wrapper.trigger('pointermove', { x, y });
            };

            dropOnTarget = (targetElement, cancels = false) => {
                if (cancels) {
                    targetElement.addEventListener('connector-drop', e => {
                        e.preventDefault();
                    });
                }
                wrapper.trigger('pointerup', { pointerId: -1 });
            };
        });

        describe('Start Dragging', () => {
            it('captures pointer', () => {
                startDragging();
                expect(wrapper.element.setPointerCapture).toHaveBeenCalledWith(-1);
            });

            it('does not capture pointer', () => {
                isWritable = false;
                startDragging();
                expect(wrapper.element.setPointerCapture).not.toHaveBeenCalledWith(-1);
            });

            it('saves KanvasElement', () => {
                startDragging();
                expect(wrapper.vm.kanvasElement).toStrictEqual(KanvasMock);
            });

            it.each(['out', 'in'])('does circle detection for %s-port', (portDirection) => {
                propsData.direction = portDirection;
                startDragging();

                expect(circleDetection).toHaveBeenCalledWith({
                    downstreamConnection: portDirection === 'out',
                    startNode: 'node:1',
                    workflow: 'workflowRef'
                });

                let rootWrapper = createWrapper(wrapper.vm.$root);
                expect(rootWrapper.emitted('connector-start')).toStrictEqual([
                    [{
                        compatibleNodes: [],
                        nodeId: 'node:1'
                    }]
                ]);
            });

            describe('Set internal variable dragConnector and position Drag-Connector and -Port', () => {
                afterEach(() => {
                    // connector is bound to 'dragConnector'
                    // connector doesn't receive pointer-events

                    let connector = wrapper.findComponent(Connector);
                    expect(connector.props()).toMatchObject(wrapper.vm.dragConnector);
                    expect(connector.attributes('class')).toMatch('non-interactive');

                    // port is moved to 'dragConnector'
                    // port doesn't receive pointer-events

                    let port = wrapper.findComponent(Port);
                    expect(port.attributes('transform')).toBe('translate(16,16)');
                    expect(port.attributes('class')).toMatch('non-interactive');
                });

                it('sets connector for out-port', () => {
                    propsData.direction = 'out';
                    startDragging([8, 8]);

                    expect(wrapper.vm.dragConnector).toStrictEqual({
                        id: 'drag-connector',
                        allowedActions: {
                            canDelete: false
                        },
                        flowVariableConnection: false,
                        absolutePoint: [16, 16],
                        sourceNode: 'node:1',
                        sourcePort: 0
                    });
                    expect(wrapper.vm.dragConnector.destNode).toBeFalsy();
                    expect(wrapper.vm.dragConnector.destPort).toBeFalsy();
                });

                it('sets connector for in-port', () => {
                    propsData.direction = 'in';
                    startDragging([8, 8]);

                    expect(wrapper.vm.dragConnector).toStrictEqual({
                        id: 'drag-connector',
                        allowedActions: {
                            canDelete: false
                        },
                        flowVariableConnection: false,
                        absolutePoint: [16, 16],
                        destNode: 'node:1',
                        destPort: 0
                    });
                    expect(wrapper.vm.dragConnector.sourceNode).toBeFalsy();
                    expect(wrapper.vm.dragConnector.sourcePort).toBeFalsy();
                });
            });
        });

        describe('Drag Move', () => {
            test('move onto nothing', () => {
                startDragging([0, 0]);
                expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([8, 8]);

                dragAboveTarget(null, [2, 2]);

                expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([10, 10]);
            });

            test('move onto element', () => {
                startDragging([0, 0]);

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget, [0, 0]);

                expect(hitTarget._connectorEnterEvent).toBeTruthy();

                expect(hitTarget._connectorMoveEvent.detail).toStrictEqual({
                    x: 8,
                    y: 8,
                    targetPortDirection: 'out',
                    overwritePosition: expect.any(Function)
                });
            });

            test('move on same element', () => {
                startDragging([0, 0]);

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget, [0, 0]);

                expect(hitTarget._connectorEnterEvent).toBeTruthy();
                expect(hitTarget._connectorMoveEvent).toBeTruthy();

                delete hitTarget._connectorEnterEvent;
                delete hitTarget._connectorMoveEvent;

                dragAboveTarget(hitTarget, [1, 1]);

                expect(hitTarget._connectorEnterEvent).toBeFalsy();
                expect(hitTarget._connectorMoveEvent).toBeTruthy();
            });

            test('move from element to nothing', () => {
                startDragging();

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget);

                dragAboveTarget(null);

                expect(hitTarget._connectorLeaveEvent).toBeTruthy();
            });

            test('move sets connector and port', () => {
                startDragging([0, 0]);
                expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([8, 8]);

                dragAboveTarget(null, [2, 2]);

                expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([10, 10]);
            });

            test('overwrite connector position', () => {
                startDragging([0, 0]);

                let hitTarget = document.createElement('div');
                hitTarget.addEventListener('connector-move', (e) => {
                    e.detail.overwritePosition([-1, -1]);
                });

                dragAboveTarget(hitTarget, [0, 0]);

                expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([-1, -1]);
            });
        });

        test('releases pointer', () => {
            startDragging();
            wrapper.trigger('pointerup', { pointerId: -1 });

            expect(wrapper.element.releasePointerCapture).toHaveBeenCalledWith(-1);
        });

        describe('Stop Dragging', () => {
            test('dispatches drop event (direction = in)', () => {
                startDragging();

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget);
                dropOnTarget();

                expect(hitTarget._connectorDropEvent.detail).toStrictEqual({
                    destNode: 'node:1',
                    destPort: 0,
                    sourceNode: undefined,
                    sourcePort: undefined
                });

                let rootWrapper = createWrapper(wrapper.vm.$root);
                expect(rootWrapper.emitted('connector-dropped')).toBeTruthy();
            });

            it('does not release capture pointer', () => {
                isWritable = false;
                startDragging();
                expect(wrapper.element.releasePointerCapture).not.toHaveBeenCalledWith(-1);
            });

            test('dispatches drop event (direction = out)', () => {
                propsData.direction = 'out';
                startDragging();

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget);
                dropOnTarget();

                expect(hitTarget._connectorDropEvent.detail).toStrictEqual({
                    sourceNode: 'node:1',
                    sourcePort: 0,
                    destNode: undefined,
                    destPort: undefined
                });

                let rootWrapper = createWrapper(wrapper.vm.$root);
                expect(rootWrapper.emitted('connector-dropped')).toBeTruthy();
            });

            test('connector-drop can be cancelled', () => {
                startDragging();

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget);
                dropOnTarget(hitTarget, true);

                let rootWrapper = createWrapper(wrapper.vm.$root);
                expect(rootWrapper.emitted('connector-dropped')).toBeFalsy();
            });

            test('lost pointer capture', () => {
                startDragging();

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget);

                wrapper.trigger('lostpointercapture');

                expect(hitTarget._connectorLeaveEvent).toBeTruthy();
                expect(wrapper.vm.dragConnector).toBeFalsy();

                let rootWrapper = createWrapper(wrapper.vm.$root);
                expect(rootWrapper.emitted('connector-end')).toBeTruthy();
            });
        });

        test("connector-enter not cancelled: doesn't raise move/leave/drop event", () => {
            startDragging([0, 0]);

            let hitTarget = document.createElement('div');
            // no prevent default

            dragAboveTarget(hitTarget, [0, 0], false);
            expect(hitTarget._connectorMoveEvent).toBeFalsy();

            dragAboveTarget(hitTarget, [1, 1]);
            expect(hitTarget._connectorMoveEvent).toBeFalsy();

            dragAboveTarget(null);
            expect(hitTarget._connectorLeaveEvent).toBeFalsy();

            dropOnTarget();
            expect(hitTarget._connectorDropEvent).toBeFalsy();
        });
    });
});
