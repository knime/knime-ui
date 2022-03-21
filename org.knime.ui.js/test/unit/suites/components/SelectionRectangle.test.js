/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

import SelectionRectangle from '~/components/SelectionRectangle';
import { findNodesInsideOfRectangle as findNodesInsideOfRectangleMock } from '~/util/rectangleSelection';

jest.mock('lodash', () => ({
    throttle(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

jest.mock('~/util/rectangleSelection', () => ({
    findNodesInsideOfRectangle: jest.fn()
}));

window.requestAnimationFrame = jest.fn().mockImplementation(fn => { fn(); });

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
                    toCanvasCoordinates: state => ([x, y]) => [x, y]
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
        };

        pointerDown = ({ pageX, pageY, shiftKey }) => {
            wrapper.vm.$parent.$emit('selection-pointerdown', {
                pointerId: pointerId || 1,
                pageX,
                pageY,
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

        pointerMove = ({ pageX, pageY }) => {
            wrapper.vm.$parent.$emit('selection-pointermove', {
                pointerId: pointerId || 1,
                pageX,
                pageY,
                currentTarget: {
                    getBoundingClientRect: () => ({
                        left: 0,
                        top: 0
                    })
                }
            });
        };

        pointerUp = () => {
            jest.useFakeTimers(); // impl contains setTimout

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

        pointerDown({ pageX: 0, pageY: 0 });
        await Vue.nextTick();

        expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();
    });

    test('appears on pointerDown, disappears on pointerUp', async () => {
        doShallowMount();
        expect(wrapper.isVisible()).toBe(false);

        pointerDown({ pageX: 0, pageY: 0 });
        await Vue.nextTick();

        expect(wrapper.isVisible()).toBe(true);

        pointerUp();
        await Vue.nextTick();

        expect(wrapper.isVisible()).toBe(false);
    });

    describe('Selection', () => {
        beforeEach(async () => {
            doShallowMount();

            pointerDown({ pageX: 10, pageY: 10 });
            pointerMove({ pageX: 300, pageY: 300 });
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
            pointerMove({ pageX: 0, pageY: 0 });
            await Vue.nextTick();

            let selectionPreviewCommands = wrapper.emitted('node-selection-preview');
            // skip first two events that select those nodes
            expect(selectionPreviewCommands.slice(2)).toStrictEqual([
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

            pointerDown({ pageX: 0, pageY: 0, shiftKey: true });
            pointerMove({ pageX: 0, pageY: 0 });
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

            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(expect.anything(), []);
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

            pointerDown({ pageX: 0, pageY: 0, shiftKey: true });
            pointerMove({ pageX: 36, pageY: 36 });
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

        it('set initial value to non-reactive data members', () => {
            doShallowMount();
            pointerId = 22;
            pointerDown({ pageX: 300, pageY: 300 });
            expect(wrapper.vm.selectOnEnd).toStrictEqual([]);
            expect(wrapper.vm.deSelectOnEnd).toStrictEqual([]);
            expect(wrapper.vm.selectedNodeIdsAtStart).toStrictEqual([]);
        });

        it('does nothing if move is called but selection is not active', async () => {
            doShallowMount();
            // pointerDown is missing
            pointerMove({ pageX: 300, pageY: 300 });
            await Vue.nextTick();
            pointerUp();
            expect(wrapper.emitted('node-selection-preview')).toBeFalsy();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(0);
        });

        it('does nothing if pointerId is different', async () => {
            doShallowMount();
            pointerId = 22;
            pointerDown({ pageX: 300, pageY: 300 });
            pointerId = 3;
            pointerMove({ pageX: 300, pageY: 300 });
            await Vue.nextTick();
            pointerUp();
            expect(wrapper.emitted('node-selection-preview')).toBeFalsy();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(0);
        });
    });
});
