/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

import SelectionRectangle from '~/components/SelectionRectangle';

const moveNodesThrottleWaitDelay = 11;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const parentComponent = { name: 'parentStub', template: '<div></div>' };

const mockNode = ({ id, position }) => ({
    name: '',
    id,
    position,
    inPorts: [],
    outPorts: [],
    type: '',
    annotation: { text: '' },
    kind: 'node',
    icon: 'data:image/',
    state: null
});

describe('SelectionRectangle', () => {
    let propsData, mocks, doShallowMount, $store, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        propsData = {};
        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: {
                        nodes: {
                            'root:0': mockNode({ id: 'root:0', position: { x: 32, y: 32 } }),
                            'root:1': mockNode({ id: 'root:1', position: { x: 50, y: 50 } }),
                            'root:2': mockNode({ id: 'root:2', position: { x: 400, y: 10 } }),
                            'root:3': mockNode({ id: 'root:3', position: { x: 50, y: 400 } }),
                            'root:4': mockNode({ id: 'root:4', position: { x: 200, y: 200 } })
                        }
                    }
                },
                mutations: {
                    setDragging: jest.fn()
                }
            },
            canvas: {
                getters: {
                    viewBox: () => ({ left: 0, top: 0, width: 500, height: 500 })
                },
                state: {
                    zoomFactor: 1
                }
            },
            selection: {
                getters: {
                    selectedNodeIds: jest.fn().mockReturnValue([])
                },
                actions: {
                    selectNode: jest.fn(),
                    deselectNode: jest.fn(),
                    deselectAllObjects: jest.fn()
                }
            }
        };

        doShallowMount = () => {
            storeConfig.selection.actions.selectNode.mockClear();
            storeConfig.selection.actions.deselectNode.mockClear();
            storeConfig.selection.actions.deselectAllObjects.mockClear();
            $store = mockVuexStore(storeConfig);
            mocks = { $store, $shapes, $colors };
            return shallowMount(SelectionRectangle, { propsData, mocks, parentComponent });
        };
    });

    it('selects all nodes', async () => {
        storeConfig.workflow.state.activeWorkflow.nodes = {
            'root:0': mockNode({ id: 'root:0', position: { x: -32, y: -32 } }),
            'root:1': mockNode({ id: 'root:1', position: { x: 50, y: 50 } }),
            'root:2': mockNode({ id: 'root:2', position: { x: 0, y: 100 } })
        };
        let wrapper = doShallowMount();
        wrapper.vm.$parent.$emit('selection-pointerdown', {
            pointerId: 1,
            offsetX: 0,
            offsetY: 0,
            shiftKey: false,
            target: { hasPointerCapture: (pointerID) => false, setPointerCapture: (pointerId) => null }
        });

        expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();

        wrapper.vm.$parent.$emit('selection-pointermove', {
            pointerId: 1,
            offsetX: 300,
            offsetY: 300
        });

        await Vue.nextTick();

        expect(storeConfig.workflow.mutations.setDragging).toHaveBeenCalledWith(expect.anything(), true);

        // one is outside of canvas (-32, -32)
        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledTimes(2);

        // stop also changes global dragging state
        wrapper.vm.$parent.$emit('selection-pointerup', {
            pointerId: 1
        });
        await delay(moveNodesThrottleWaitDelay);
        await Vue.nextTick();
        expect(storeConfig.workflow.mutations.setDragging).toHaveBeenCalledWith(expect.anything(), false);
    });

    it('selects multiple nodes', async () => {
        let wrapper = doShallowMount();
        wrapper.vm.$parent.$emit('selection-pointerdown', {
            pointerId: 1,
            offsetX: 0,
            offsetY: 0,
            shiftKey: false,
            target: { hasPointerCapture: (pointerID) => true }
        });

        expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();

        wrapper.vm.$parent.$emit('selection-pointermove', {
            pointerId: 1,
            offsetX: 300,
            offsetY: 300
        });

        await delay(moveNodesThrottleWaitDelay);
        await Vue.nextTick();

        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledTimes(3);
    });

    it('selects single node', async () => {
        storeConfig.workflow.state.activeWorkflow.nodes = {
            'root:0': mockNode({ id: 'root:1', position: { x: 50, y: 50 } }),
            'root:1': mockNode({ id: 'root:2', position: { x: 100, y: 100 } })
        };
        let wrapper = doShallowMount();
        wrapper.vm.$parent.$emit('selection-pointerdown', {
            pointerId: 1,
            offsetX: 56,
            offsetY: 50 + 32,
            shiftKey: false,
            target: { hasPointerCapture: (pointerID) => true }
        });

        expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();

        wrapper.vm.$parent.$emit('selection-pointermove', {
            pointerId: 1,
            offsetX: 50 + 32,
            offsetY: 58
        });

        await delay(moveNodesThrottleWaitDelay);
        await Vue.nextTick();

        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledTimes(1);
    });

    it('selects single node from bottom right to top left', async () => {
        storeConfig.workflow.state.activeWorkflow.nodes = {
            'root:0': mockNode({ id: 'root:1', position: { x: 50, y: 50 } }),
            'root:1': mockNode({ id: 'root:2', position: { x: 100, y: 100 } })
        };
        let wrapper = doShallowMount();
        wrapper.vm.$parent.$emit('selection-pointerdown', {
            pointerId: 1,
            offsetX: 50 + 32 + 2,
            offsetY: 50 + 32 + 2,
            shiftKey: false,
            target: { hasPointerCapture: (pointerID) => true }
        });

        expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();

        wrapper.vm.$parent.$emit('selection-pointermove', {
            pointerId: 1,
            offsetX: 52,
            offsetY: 52
        });

        await delay(moveNodesThrottleWaitDelay);
        await Vue.nextTick();

        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledTimes(1);
    });

    it('selects single node partly', async () => {
        storeConfig.workflow.state.activeWorkflow.nodes = {
            'root:0': mockNode({ id: 'root:1', position: { x: 50, y: 50 } }),
            'root:1': mockNode({ id: 'root:2', position: { x: 100, y: 100 } })
        };
        let wrapper = doShallowMount();
        wrapper.vm.$parent.$emit('selection-pointerdown', {
            pointerId: 1,
            offsetX: 50 + 32 + 2,
            offsetY: 49,
            shiftKey: false,
            target: { hasPointerCapture: (pointerID) => true }
        });

        expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();

        wrapper.vm.$parent.$emit('selection-pointermove', {
            pointerId: 1,
            offsetX: 52,
            offsetY: 52
        });

        await delay(moveNodesThrottleWaitDelay);
        await Vue.nextTick();

        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledTimes(1);
    });

    it('deselects already selected items with shift', async () => {
        storeConfig.selection.getters.selectedNodeIds = jest.fn().mockReturnValue([
            'root:0',
            'root:2'
        ]);
        let wrapper = doShallowMount();

        wrapper.vm.$parent.$emit('selection-pointerdown', {
            pointerId: 1,
            offsetX: 0,
            offsetY: 0,
            shiftKey: true,
            target: { hasPointerCapture: (pointerID) => true }
        });

        expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalledTimes(0);

        wrapper.vm.$parent.$emit('selection-pointermove', {
            pointerId: 1,
            offsetX: 300,
            offsetY: 300
        });

        // see moveNodesThrottle
        await delay(moveNodesThrottleWaitDelay);
        await Vue.nextTick();

        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledTimes(3);
        expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledTimes(2);

        expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledWith(expect.anything(), 'root:0');
        expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledWith(expect.anything(), 'root:3');

        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:2');
        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:4');
    });
});
