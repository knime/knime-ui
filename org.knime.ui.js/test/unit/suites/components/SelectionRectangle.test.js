/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

import SelectionRectangle from '~/components/SelectionRectangle';

jest.mock('lodash', () => ({
    throttle(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

const parentComponent = {
    name: 'parentStub',
    template: '<div></div>'
};

const mockNode = ({
    id,
    position
}) => ({
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
    let wrapper, propsData, mocks, doShallowMount, $store, storeConfig, pointerDown, pointerUp, pointerMove, pointerId;

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
                            'root:0': mockNode({
                                id: 'root:0',
                                position: {
                                    x: 32,
                                    y: 32
                                }
                            }),
                            'root:1': mockNode({
                                id: 'root:1',
                                position: {
                                    x: 50,
                                    y: 50
                                }
                            }),
                            'root:2': mockNode({
                                id: 'root:2',
                                position: {
                                    x: 400,
                                    y: 10
                                }
                            }),
                            'root:3': mockNode({
                                id: 'root:3',
                                position: {
                                    x: 50,
                                    y: 400
                                }
                            }),
                            'root:4': mockNode({
                                id: 'root:4',
                                position: {
                                    x: 200,
                                    y: 200
                                }
                            })
                        }
                    }
                }
            },
            canvas: {
                getters: {
                    fromAbsoluteCoordinates: state => ([x, y]) => [x, y]
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
            storeConfig.selection.actions.selectNodes.mockClear();
            storeConfig.selection.actions.deselectNodes.mockClear();
            storeConfig.selection.actions.deselectAllObjects.mockClear();
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

        pointerDown = ({
            pageX,
            pageY,
            shiftKey
        }) => {
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

        pointerMove = ({
            pageX,
            pageY
        }) => {
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

    it('selects all nodes', async () => {
        storeConfig.workflow.state.activeWorkflow.nodes = {
            'root:0': mockNode({
                id: 'root:0',
                position: {
                    x: -32,
                    y: -32
                }
            }),
            'root:1': mockNode({
                id: 'root:1',
                position: {
                    x: 50,
                    y: 50
                }
            }),
            'root:2': mockNode({
                id: 'root:2',
                position: {
                    x: 0,
                    y: 100
                }
            })
        };
        doShallowMount();

        expect(wrapper.isVisible()).toBe(false);

        pointerDown({
            pageX: 0,
            pageY: 0
        });
        await Vue.nextTick();
        expect(wrapper.isVisible()).toBe(true);
        expect(storeConfig.selection.actions.deselectAllObjects).toBeCalled();

        pointerMove({
            pageX: 300,
            pageY: 300
        });
        await Vue.nextTick();
        expect(wrapper.emitted('node-selection-preview')).toStrictEqual([[{
            nodeId: 'root:1',
            type: 'show'
        }], [{
            nodeId: 'root:2',
            type: 'show'
        }]]);

        pointerUp();
        // one is outside of canvas (-32, -32)
        expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(expect.anything(), ['root:1', 'root:2']);
    });

    it('selects single node', async () => {
        storeConfig.workflow.state.activeWorkflow.nodes = {
            'root:1': mockNode({
                id: 'root:1',
                position: {
                    x: 50,
                    y: 50
                }
            }),
            'root:2': mockNode({
                id: 'root:2',
                position: {
                    x: 100,
                    y: 100
                }
            })
        };
        doShallowMount();
        pointerDown({
            pageX: 0,
            pageY: 0
        });

        pointerMove({
            pageX: 50 + $shapes.nodeSize,
            pageY: 58
        });
        await Vue.nextTick();
        expect(wrapper.emitted('node-selection-preview')).toStrictEqual([[{
            nodeId: 'root:1',
            type: 'show'
        }]]);

        pointerUp();
        expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(expect.anything(), ['root:1']);
    });

    it('removes selection preview of previously selected nodes', async () => {
        doShallowMount();

        pointerDown({ pageX: 0, pageY: 0 });
        // select stuff (tested in other tests)
        pointerMove({ pageX: 300, pageY: 300 });
        await Vue.nextTick();
        // remove selection preview again
        pointerMove({ pageX: 5, pageY: 5 });
        await Vue.nextTick();

        expect(wrapper.emitted('node-selection-preview').slice(-3)).toStrictEqual([[{
            nodeId: 'root:0',
            type: 'clear'
        }], [{
            nodeId: 'root:1',
            type: 'clear'
        }], [{
            nodeId: 'root:4',
            type: 'clear'
        }]]);

        pointerUp();

        expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(expect.anything(), []);
        expect(storeConfig.selection.actions.deselectNodes).toHaveBeenCalledWith(expect.anything(), []);
    });

    describe('different selection rects', () => {
        it('selects single node from bottom right to top left', async () => {
            storeConfig.workflow.state.activeWorkflow.nodes = {
                'root:1': mockNode({
                    id: 'root:1',
                    position: {
                        x: 50,
                        y: 50
                    }
                }),
                'root:2': mockNode({
                    id: 'root:2',
                    position: {
                        x: 100,
                        y: 100
                    }
                })
            };
            doShallowMount();
            pointerDown({
                pageX: 150,
                pageY: 150
            });
            expect(wrapper.vm.startPos).toStrictEqual({
                x: 150,
                y: 150
            });

            pointerMove({
                pageX: 90,
                pageY: 90
            });
            await Vue.nextTick();
            expect(wrapper.emitted('node-selection-preview')).toStrictEqual([[{
                nodeId: 'root:2',
                type: 'show'
            }]]);

            pointerUp();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(expect.anything(), ['root:2']);
        });

        it('selects single node, even if it\'s not fully inside of the rect', async () => {
            storeConfig.workflow.state.activeWorkflow.nodes = {
                'root:1': mockNode({
                    id: 'root:1',
                    position: {
                        x: 50,
                        y: 50
                    }
                }),
                'root:2': mockNode({
                    id: 'root:2',
                    position: {
                        x: 100,
                        y: 100
                    }
                })
            };
            doShallowMount();
            pointerDown({
                pageX: 50 + $shapes.nodeSize + 2,
                pageY: 49
            });

            pointerMove({
                pageX: 52,
                pageY: 52
            });
            await Vue.nextTick();
            expect(wrapper.emitted('node-selection-preview')).toStrictEqual([[{
                nodeId: 'root:1',
                type: 'show'
            }]]);

            pointerUp();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(expect.anything(), ['root:1']);
        });

        it('selects node with rect from bottom left to top right', async () => {
            storeConfig.workflow.state.activeWorkflow.nodes = {
                'root:1': mockNode({
                    id: 'root:1',
                    position: {
                        x: 50,
                        y: 50
                    }
                })
            };
            doShallowMount();
            pointerDown({
                pageX: 10,
                pageY: 100
            });

            pointerMove({
                pageX: 100,
                pageY: 10
            });
            await Vue.nextTick();
            expect(wrapper.emitted('node-selection-preview')).toStrictEqual([[{
                nodeId: 'root:1',
                type: 'show'
            }]]);

            pointerUp();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(expect.anything(), ['root:1']);
        });
    });

    describe('selection with shift', () => {
        it('adds to selection with shift', async () => {
            storeConfig.selection.getters.selectedNodeIds = jest.fn().mockReturnValue([
                'root:1'
            ]);
            doShallowMount();

            pointerDown({ pageX: 0, pageY: 0, shiftKey: true });
            // no de-select with shift
            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalledTimes(0);

            pointerMove({ pageX: 36, pageY: 36 });
            await Vue.nextTick();
            expect(wrapper.emitted('node-selection-preview')).toStrictEqual([
                [{
                    nodeId: 'root:0',
                    type: 'show'
                }]
            ]);

            pointerUp();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(expect.anything(), ['root:0']);
        });

        it('deselects already selected items with shift', async () => {
            storeConfig.selection.getters.selectedNodeIds = jest.fn().mockReturnValue([
                'root:0',
                'root:2'
            ]);
            doShallowMount();

            pointerDown({ pageX: 0, pageY: 0, shiftKey: true });
            // no de-select with shift
            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalledTimes(0);

            pointerMove({ pageX: 300, pageY: 300 });
            await Vue.nextTick();
            expect(wrapper.emitted('node-selection-preview')).toStrictEqual([
                [{
                    nodeId: 'root:0',
                    type: 'hide'
                }],
                [{
                    nodeId: 'root:1',
                    type: 'show'
                }],
                [{
                    nodeId: 'root:4',
                    type: 'show'
                }]
            ]);


            pointerUp();

            expect(wrapper.emitted('node-selection-preview').slice(-3)).toStrictEqual([[{
                nodeId: 'root:1',
                type: 'clear'
            }], [{
                nodeId: 'root:4',
                type: 'clear'
            }], [{
                nodeId: 'root:0',
                type: 'clear'
            }]]);

            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledWith(
                expect.anything(),
                ['root:1', 'root:4']
            );
            expect(storeConfig.selection.actions.deselectNodes).toHaveBeenCalledWith(expect.anything(), ['root:0']);
        });
    });

    describe('non actions', () => {
        it('unregisters events on beforeDestroy', () => {
            doShallowMount();
            wrapper.vm.$parent.$off = jest.fn();
            wrapper.destroy();
            expect(wrapper.vm.$parent.$off).toHaveBeenCalledTimes(4);
        });

        it('does noting if move is called but selection is not active', async () => {
            doShallowMount();
            // pointerDown is missing
            pointerMove({ pageX: 300, pageY: 300 });
            await Vue.nextTick();
            pointerUp();
            expect(wrapper.emitted('node-selection-preview')).toBeFalsy();
            expect(storeConfig.selection.actions.selectNodes).toHaveBeenCalledTimes(0);
        });

        it('does noting if pointerId is different', async () => {
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
