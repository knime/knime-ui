import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import DraggablePortWithTooltip from '~/components/DraggablePortWithTooltip';
import PortWithTooltip from '~/components/PortWithTooltip';
import Port from '~/components/Port';
import Connector from '~/components/Connector';
import Vue from 'vue';
import { afterEach } from '@jest/globals';

jest.mock('lodash', () => ({
    throttle(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

describe('DraggablePortWithTooltip', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let propsData, $store, doShallowMount, storeConfig, wrapper;

    beforeEach(() => {
        propsData = {
            direction: 'in',
            nodeId: 'node:1',
            relativePosition: [16, 32],
            port: {
                type: 'port',
                inactive: false,
                index: 0
            }
        };
        storeConfig = {
            workflow: {
                actions: {
                    connectNodes: jest.fn()
                }
            },
            canvas: {
                getters: {
                    fromAbsoluteCoordinates: () => x => x
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

    describe('Drop Connector', () => {
        test('highlight drop target on hover', async () => {
            doShallowMount();

            expect(wrapper.attributes().class).not.toMatch('targeted');

            wrapper.trigger('connector-enter');
            await Vue.nextTick();

            expect(wrapper.attributes().class).toMatch('targeted');

            wrapper.trigger('connector-leave');
            await Vue.nextTick();

            expect(wrapper.attributes().class).not.toMatch('targeted');
        });

        test('call api to connect nodes (forward)', () => {
            propsData.nodeId = 'destNode';
            propsData.direction = 'in';
            propsData.port.index = 1;

            doShallowMount();

            wrapper.trigger('connector-drop', {
                detail: {
                    sourceNode: 'sourceNode',
                    sourcePort: 0
                }
            });

            expect(storeConfig.workflow.actions.connectNodes).toHaveBeenCalledWith(expect.anything(), {
                sourceNode: 'sourceNode',
                sourcePort: 0,
                destNode: 'destNode',
                destPort: 1
            });
        });

        test('call api to connect nodes (backwards)', () => {
            propsData.nodeId = 'sourceNode';
            propsData.direction = 'out';
            propsData.port.index = 0;

            doShallowMount();

            wrapper.trigger('connector-drop', {
                detail: {
                    destNode: 'destNode',
                    destPort: 1
                }
            });

            expect(storeConfig.workflow.actions.connectNodes).toHaveBeenCalledWith(expect.anything(), {
                sourceNode: 'sourceNode',
                sourcePort: 0,
                destNode: 'destNode',
                destPort: 1
            });
        });
    });

    describe('Drag Connector', () => {
        let startDragging, dragAboveTarget, KanvasMock;

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
                wrapper.trigger('pointerdown', { pointerId: -1, x, y });
            };

            dragAboveTarget = (targetElement, [x, y] = [0, 0]) => {
                document.elementFromPoint = jest.fn().mockReturnValueOnce(targetElement);

                if (targetElement) {
                    targetElement.addEventListener('connector-enter', e => {
                        targetElement._connectorEnterEvent = e;
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
        });

        describe('Start Dragging', () => {
            it('captures pointer', () => {
                startDragging();
                expect(wrapper.element.setPointerCapture).toHaveBeenCalledWith(-1);
            });

            it('saves KanvasElement', () => {
                startDragging();
                expect(wrapper.vm.kanvasElement).toStrictEqual(KanvasMock);
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
                        canDelete: false,
                        flowVariableConnection: false,
                        absolutePoint: [16, 16],
                        sourceNode: 'node:1',
                        sourcePort: 0,
                    });
                    expect(wrapper.vm.dragConnector.destNode).toBeFalsy();
                    expect(wrapper.vm.dragConnector.destPort).toBeFalsy();
                });

                it('sets connector for in-port', () => {
                    propsData.direction = 'in';
                    startDragging([8, 8]);

                    expect(wrapper.vm.dragConnector).toStrictEqual({
                        id: 'drag-connector',
                        canDelete: false,
                        flowVariableConnection: false,
                        absolutePoint: [16, 16],
                        destNode: 'node:1',
                        destPort: 0,
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
                    x: 0, y: 0
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

                wrapper.trigger('pointerup', { pointerId: -1 });

                expect(hitTarget._connectorDropEvent.detail).toStrictEqual({
                    destNode: 'node:1',
                    destPort: 0,
                    sourceNode: undefined,
                    sourcePort: undefined
                });
            });

            test('dispatches drop event (direction = out)', () => {
                propsData.direction = 'out';
                startDragging();

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget);

                wrapper.trigger('pointerup', { pointerId: -1 });

                expect(hitTarget._connectorDropEvent.detail).toStrictEqual({
                    sourceNode: 'node:1',
                    sourcePort: 0,
                    destNode: undefined,
                    destPort: undefined
                });
            });

            test('lost pointer capture', () => {
                startDragging();

                let hitTarget = document.createElement('div');
                dragAboveTarget(hitTarget);

                wrapper.trigger('lostpointercapture');

                expect(hitTarget._connectorLeaveEvent).toBeTruthy();
                expect(wrapper.vm.dragConnector).toBeFalsy();
            });
        });
    });
});
