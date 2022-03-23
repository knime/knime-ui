import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';
import * as $shapes from '~/style/shapes';

import MoveableNodeContainer from '~/components/workflow/MoveableNodeContainer';

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
                    setDragging: jest.fn(),
                    resetDragPosition: jest.fn()
                },
                getters: {
                    isWritable() { return true; }
                },
                actions: {
                    moveNodes: jest.fn(),
                    saveNodeMoves: jest.fn()
                },
                state: {
                    isDragging: false,
                    deltaMovePosition: { x: 250, y: 250 },
                    activeWorkflow: { nodes: { 'root:1': { id: 'root:1' }, 'root:2': { id: 'root:2' } } }
                }
            },
            canvas: {
                state: {
                    zoomFactor: 1
                }
            },
            application: {
                state() {
                    return { activeProjectId: 'projectId' };
                }
            },
            selection: {
                getters: {
                    isNodeSelected: () => jest.fn()
                },
                actions: {
                    deselectAllObjects: jest.fn(),
                    selectNode: jest.fn()
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
            doMount();
            const transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe('translate(500, 200)');
        });

        it('deselects nodes on movement of unselected node', () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(false);
            doMount();

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
            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('does not deselect nodes when node is already selected', () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValue(true);
            propsData.id = 'root:2';
            doMount();

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
            expect(storeConfig.selection.actions.deselectAllObjects).not.toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:2')
            );
        });

        it('makes sure outline is not moved when moving a single node and correctly reset after movement', async () => {
            doMount();
            wrapper.setProps({ position: { x: 200, y: 200 } });
            await Vue.nextTick();
            wrapper.setProps({ dragGhostPosition: { x: 250, y: 250 } });
            wrapper.setProps({ position: { x: 250, y: 250 } });
            await Vue.nextTick();
            expect(storeConfig.workflow.mutations.resetDragPosition).toHaveBeenCalledTimes(2);
        });

        it('moves a single node', () => {
            const kanvasMock = document.createElement('div');
            kanvasMock.id = 'kanvas';
            document.body.appendChild(kanvasMock);

            const initialNodePosition = { x: 500, y: 200 };
            const positionAfterMove = {
                x: initialNodePosition.x + 100,
                y: initialNodePosition.y + 100
            };

            storeConfig.workflow.state.isDragging = true;
            storeConfig.canvas.getters = {
                fromAbsoluteCoordinates: () => jest.fn(() => [positionAfterMove.x, positionAfterMove.y])
            };

            doMount();
            
            const moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    event: { shiftKey: false }
                }
            });
            wrapper.vm.onMoveStart(moveStartEvent);

            const moveMovingEvent = new CustomEvent('moving', {
                detail: {
                    clientX: 250,
                    clientY: 250,
                    e: { detail: { event: { shiftKey: false } } }
                }
            });
            wrapper.vm.onMove(moveMovingEvent);

            const expectedDelta = {
                deltaX: positionAfterMove.x - initialNodePosition.x - $shapes.nodeSize / 2,
                deltaY: positionAfterMove.y - initialNodePosition.y - $shapes.nodeSize / 2
            };

            expect(storeConfig.workflow.actions.moveNodes).toHaveBeenCalledWith(
                expect.anything(),
                expectedDelta
            );
        });

        it('ends movement of a node', async () => {
            doMount();
            jest.useFakeTimers();
            wrapper.vm.onMoveEnd();
            jest.advanceTimersByTime(5000); /* eslint-disable-line no-magic-numbers */
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
