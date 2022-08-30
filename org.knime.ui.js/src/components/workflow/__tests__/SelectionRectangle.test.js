/* eslint-disable no-magic-numbers */
import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import * as $shapes from '@/style/shapes.mjs';
import * as $colors from '@/style/colors.mjs';

import { findNodesInsideOfRectangle as findNodesInsideOfRectangleMock } from '@/util/rectangleSelection';
import SelectionRectangle from '../SelectionRectangle.vue';

jest.mock('raf-throttle', () => function (func) {
    return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
    };
});

jest.mock('@/util/rectangleSelection', () => ({
    findNodesInsideOfRectangle: jest.fn()
}));

const parentComponent = {
    name: 'parentStub',
    template: '<div></div>'
};

describe('SelectionRectangle', () => {
    let wrapper, propsData, mocks, doShallowMount, $store, workflow, storeConfig,
        pointerDown, pointerUp, pointerMove, pointerId;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        propsData = {};
        workflow = {
            nodes: {}
        };

        findNodesInsideOfRectangleMock.mockReturnValue({
            inside: ['inside-1', 'inside-2'],
            outside: ['outside-1', 'outside-2']
        });

        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: workflow
                }
            },
            canvas: {
                getters: {
                    screenToCanvasCoordinates: () => jest.fn().mockImplementation(([x, y]) => [x, y])
                }
            },
            selection: {
                getters: {
                    selectedNodeIds: jest.fn().mockReturnValue([])
                },
                actions: {
                    selectNodes: jest.fn(),
                    deselectNodes: jest.fn(),
                    deselectAllObjects: jest.fn()
                }
            }
        };

        doShallowMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = {
                $store,
                $shapes,
                $colors
            };
            wrapper = shallowMount(
                SelectionRectangle, {
                    propsData,
                    mocks,
                    parentComponent
                }
            );

            const kanvasMock = document.createElement('div');
            kanvasMock.id = 'kanvas';
            document.body.appendChild(kanvasMock);
        };

        pointerDown = ({
            clientX,
            clientY,
            shiftKey
        }) => {
            wrapper.vm.$parent.$emit('selection-pointerdown', {
                pointerId: pointerId || 1,
                clientX,
                clientY,
                shiftKey: shiftKey || false,
                currentTarget: {
                    getBoundingClientRect: () => ({
                        left: 0,
                        top: 0
                    })
                },
                target: {
                    setPointerCapture: (pointerId) => null
                }
            });
        };

        pointerMove = ({
            clientX,
            clientY
        }) => {
            wrapper.vm.$parent.$emit('selection-pointermove', {
                pointerId: pointerId || 1,
                clientX,
                clientY,
                currentTarget: {
                    getBoundingClientRect: () => ({
                        left: 0,
                        top: 0
                    })
                }
            });
        };

        pointerUp = () => {
            jest.useFakeTimers(); // implementation contains setTimout

            // stop also changes global dragging state
            wrapper.vm.$parent.$emit('selection-pointerup', {
                pointerId: pointerId || 1,
                target: {
                    releasePointerCapture: jest.fn()
                }
            });

            jest.runAllTimers();
        };
    });

    afterEach(() => {
        storeConfig.selection.actions.selectNodes.mockClear();
        storeConfig.selection.actions.deselectNodes.mockClear();
        storeConfig.selection.actions.deselectAllObjects.mockClear();
    });

    test('all object are deselected on start', async () => {
        doShallowMount();

        pointerDown({ clientX: 0, clientY: 0 });
        await Vue.nextTick();

        expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();
    });

    test('appears on pointerDown, disappears on pointerUp', async () => {
        doShallowMount();
        expect(wrapper.isVisible()).toBe(false);

        pointerDown({ clientX: 0, clientY: 0 });
        await Vue.nextTick();

        expect(wrapper.isVisible()).toBe(true);

        pointerUp();
        await Vue.nextTick();

        expect(wrapper.isVisible()).toBe(false);
    });

    describe('Selection', () => {
        beforeEach(async () => {
            doShallowMount();

            pointerDown({ clientX: 10, clientY: 10 });
            pointerMove({ clientX: 300, clientY: 300 });
            await Vue.nextTick();
        });

        it('correctly uses algorithm to find included and excluded nodes', () => {
            expect(findNodesInsideOfRectangleMock).toHaveBeenCalledWith({
                startPos: { x: 10, y: 10 },
                endPos: { x: 300, y: 300 },
                workflow
            });
        });

        it('shows selection preview for included nodes', () => {
            expect(wrapper.emitted('node-selection-preview')).toStrictEqual([[{
                nodeId: 'inside-1',
                type: 'show'
            }], [{
                nodeId: 'inside-2',
                type: 'show'
            }]]);
        });

        it('removes selection preview of previously selected nodes', async () => {
            // move those nodes out of selection
            findNodesInsideOfRectangleMock.mockReturnValue({
                inside: [],
                outside: ['inside-1', 'inside-2']
            });
            pointerMove({ clientX: 0, clientY: 0 });
            await Vue.nextTick();

            const selectionPreviewEvents = wrapper.emitted('node-selection-preview');
            // skip first two events that select those nodes
            expect(selectionPreviewEvents.slice(2)).toStrictEqual([
                [{
                    nodeId: 'inside-1',
                    type: 'clear'
                }],
                [{
                    nodeId: 'inside-2',
                    type: 'clear'
                }]
            ]);
        });

        it('selects nodes on pointer up', () => {
            pointerUp();

            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(
                expect.anything(), ['inside-1', 'inside-2']
            );
        });
    });

    describe('De-Selection with Shift', () => {
        beforeEach(async () => {
            storeConfig.selection.getters.selectedNodeIds = jest.fn().mockReturnValue([
                'inside-1',
                'inside-2'
            ]);
            doShallowMount();

            pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
            pointerMove({ clientX: 0, clientY: 0 });
            await Vue.nextTick();
        });

        test('no global deselection', () => {
            expect(storeConfig.selection.actions.deselectAllObjects).not.toHaveBeenCalled();
        });

        it('deselects already selected nodes with preview', () => {
            expect(wrapper.emitted('node-selection-preview')).toStrictEqual([
                [{
                    nodeId: 'inside-1',
                    type: 'hide'
                }],
                [{
                    nodeId: 'inside-2',
                    type: 'hide'
                }]
            ]);
        });

        it('pointerup clears selection preview', () => {
            pointerUp();

            expect(wrapper.emitted('node-selection-preview').slice(2)).toStrictEqual([
                [{
                    nodeId: 'inside-1',
                    type: 'clear'
                }], [{
                    nodeId: 'inside-2',
                    type: 'clear'
                }]
            ]);
        });

        it('pointerup deselects nodes', () => {
            pointerUp();

            expect(storeConfig.selection.actions.selectNodes).not.toHaveBeenCalled();
            expect(storeConfig.selection.actions.deselectNodes).toHaveBeenCalledWith(
                expect.anything(), ['inside-1', 'inside-2']
            );
        });
    });

    describe('Selection with shift', () => {
        it('adds to selection with shift', async () => {
            storeConfig.selection.getters.selectedNodeIds = jest.fn().mockReturnValue([
                'root:1'
            ]);
            doShallowMount();

            pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
            pointerMove({ clientX: 36, clientY: 36 });
            await Vue.nextTick();

            expect(wrapper.emitted('node-selection-preview')).toStrictEqual([
                [{
                    nodeId: 'inside-1',
                    type: 'show'
                }],
                [{
                    nodeId: 'inside-2',
                    type: 'show'
                }]
            ]);

            pointerUp();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(
                expect.anything(), ['inside-1', 'inside-2']
            );
        });
    });

    describe('non actions', () => {
        it('unregisters events on beforeDestroy', () => {
            doShallowMount();
            wrapper.vm.$parent.$off = jest.fn();
            wrapper.destroy();
            expect(wrapper.vm.$parent.$off).toHaveBeenCalledTimes(4);
        });

        it('does nothing if move is called but selection is not active', async () => {
            doShallowMount();
            // pointerDown is missing
            pointerMove({ clientX: 300, clientY: 300 });
            await Vue.nextTick();
            pointerUp();
            expect(wrapper.emitted('node-selection-preview')).toBeFalsy();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(0);
        });

        it('does nothing if pointerId is different', async () => {
            doShallowMount();
            pointerId = 22;
            pointerDown({ clientX: 300, clientY: 300 });
            pointerId = 3;
            pointerMove({ clientX: 300, clientY: 300 });
            await Vue.nextTick();
            pointerUp();
            expect(wrapper.emitted('node-selection-preview')).toBeFalsy();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(0);
        });
    });
});
