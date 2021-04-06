import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';
import * as $shapes from '~/style/shapes';

import MoveableNodeContainer from '~/components/MoveableNodeContainer';

import '~/plugins/directive-move';

const commonNode = {
    id: 'root:1',
    kind: 'node',

    position: { x: 500, y: 200 },
    selected: false
};

describe('MoveableNodeContainer', () => {
    let propsData, doMount, wrapper, storeConfig, mocks;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        storeConfig = {
            workflow: {
                mutations: {
                    selectNode: jest.fn(),
                    deselectNode: jest.fn(),
                    deselectAllNodes: jest.fn(),
                    setDragging: jest.fn(),
                    resetDragPosition: jest.fn()
                },
                getters: {
                    selectedNodes() { return () => [{ id: 'root:2', selected: true }, { id: 'test2' }]; },
                    isWritable() { return true; }
                },
                actions: {
                    moveNodes: jest.fn(),
                    saveNodeMoves: jest.fn()
                },
                state: {
                    isDragging: false,
                    deltaMovePosition: { x: 250, y: 250 }
                }
            },
            canvas: {
                state: {
                    zoomFactor: 1
                }
            },
            openedProjects: {
                state() {
                    return { activeId: 'projectId' };
                }
            }
        };
        propsData = {
            // insert node before mounting
        };

        mocks = {
            $shapes
        };

        doMount = () => {
            mocks.$store = mockVuexStore(storeConfig);
            wrapper = shallowMount(MoveableNodeContainer, { propsData, mocks });
        };
    });

    describe('moving', () => {
        beforeEach(() => {
            propsData =
            {
                ...commonNode,
                selected: true,
                allowedActions: { canExecute: true, canOpenDialog: true, canOpenView: false },
                state: {
                    executionState: 'IDLE'
                }
            };
        });

        it('renders at right position', () => {
            doMount(shallowMount);
            const transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe('translate(500, 200)');
        });

        it('deselects nodes on movement of undselected node', () => {
            propsData.selected = false;
            doMount(shallowMount);

            let moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    startX: 199,
                    startY: 199,
                    event: {
                        shiftKey: false
                    }
                }
            });
            wrapper.vm.onMoveStart(moveStartEvent);
            expect(storeConfig.workflow.mutations.deselectAllNodes).toHaveBeenCalled();
            expect(storeConfig.workflow.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('does not deselect nodes when node is already selected', () => {
            propsData.id = 'root:2';
            doMount(shallowMount);

            let moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    startX: 199,
                    startY: 199,
                    event: {
                        shiftKey: false
                    }
                }
            });
            wrapper.vm.onMoveStart(moveStartEvent);
            expect(storeConfig.workflow.mutations.deselectAllNodes).not.toHaveBeenCalled();
            expect(storeConfig.workflow.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:2');
        });

        it('makes sure outline is not moved when moving a single node and correctly reset after movement', async () => {
            doMount(shallowMount);
            wrapper.setProps({ position: { x: 200, y: 200 } });
            await Vue.nextTick();
            wrapper.setProps({ dragGhostPosition: { x: 250, y: 250 } });
            wrapper.setProps({ position: { x: 250, y: 250 } });
            await Vue.nextTick();
            expect(storeConfig.workflow.mutations.resetDragPosition).toHaveBeenCalledTimes(2);
        });

        it('moves a single node', async () => {
            storeConfig.workflow.state.isDragging = true;
            doMount(shallowMount);
            wrapper.vm.startPos.x = 500;
            wrapper.vm.startPos.y = 200;

            let moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    startX: 199,
                    startY: 199,
                    event: {
                        shiftKey: false
                    }
                }
            });
            wrapper.vm.onMoveStart(moveStartEvent);

            wrapper.setProps({ position: { x: 500, y: 200 } });
            await Vue.nextTick();
            let moveMovingEvent = new CustomEvent('moving', {
                detail: {
                    totalDeltaX: 250,
                    totalDeltaY: 250,
                    e: { detail: { event: { shiftKey: false } } }
                }
            });
            wrapper.vm.onMove(moveMovingEvent);
            expect(storeConfig.workflow.actions.moveNodes).toHaveBeenCalledWith(
                expect.anything(),
                { deltaX: 250, deltaY: 250 }
            );
            expect(wrapper.vm.combinedPosition).toStrictEqual({ x: 750, y: 450 });
        });

        it('ends movement of a node', async () => {
            doMount(shallowMount);
            jest.useFakeTimers();
            wrapper.vm.onMoveEnd();
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            jest.runOnlyPendingTimers();
            expect(storeConfig.workflow.actions.saveNodeMoves).toHaveBeenCalledWith(
                expect.anything(),
                { nodeId: 'root:1', projectId: 'projectId', startPos: { x: 0, y: 0 } }
            );
            jest.useRealTimers();
        });
    });
});
