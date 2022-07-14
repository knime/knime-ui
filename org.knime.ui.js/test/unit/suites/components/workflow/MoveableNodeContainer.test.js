import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';
import * as $shapes from '~/style/shapes';

import MoveableNodeContainer from '~/components/workflow/MoveableNodeContainer';

import '~/plugins/directive-move';

jest.mock('raf-throttle', () => function (func) {
    return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
    };
});

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
                    resetMovePreview: jest.fn(),
                    setMovePreview: jest.fn()
                },
                getters: {
                    isWritable() {
                        return true;
                    },
                    isDragging() {
                        return false;
                    }
                },
                actions: {
                    moveObjects: jest.fn()
                },
                state: {
                    isDragging: false,
                    movePreviewDelta: { x: 250, y: 250 },
                    activeWorkflow: { nodes: { 'root:1': { id: 'root:1' }, 'root:2': { id: 'root:2' } } }
                }
            },
            canvas: {
                state: {
                    zoomFactor: 1
                },
                getters: { }
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

        it.each([
            ['without grid', { x: 1, y: 1 }, true],
            ['with grid', $shapes.gridSize, false]
        ])('moves a single node %s', (_, gridSize, altKey) => {
            const kanvasMock = document.createElement('div');
            kanvasMock.id = 'kanvas';
            document.body.appendChild(kanvasMock);

            const initialNodePosition = { x: 500, y: 200 };
            const positionAfterMove = {
                x: initialNodePosition.x + 100,
                y: initialNodePosition.y + 100
            };

            storeConfig.workflow.state.isDragging = true;
            storeConfig.canvas.getters.screenToCanvasCoordinates =
                () => jest.fn(() => [positionAfterMove.x, positionAfterMove.y]);

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
                    altKey,
                    e: { detail: { event: { shiftKey: false } } }
                }
            });
            wrapper.vm.onMove(moveMovingEvent);

            const initialDelta = {
                x: positionAfterMove.x - initialNodePosition.x - $shapes.nodeSize / 2,
                y: positionAfterMove.y - initialNodePosition.y - $shapes.nodeSize / 2
            };

            const expectedDelta = {
                deltaX: Math.round(initialDelta.x / gridSize.x) * gridSize.x,
                deltaY: Math.round(initialDelta.y / gridSize.y) * gridSize.y
            };

            expect(storeConfig.workflow.mutations.setMovePreview).toHaveBeenCalledWith(
                expect.anything(),
                expectedDelta
            );
        });

        it('ends movement of a node', async () => {
            doMount();
            jest.useFakeTimers();

            wrapper.vm.onMoveEnd();
            
            jest.advanceTimersByTime(5000); /* eslint-disable-line no-magic-numbers */
            await Vue.nextTick();

            jest.runOnlyPendingTimers();
            expect(storeConfig.workflow.actions.moveObjects).toHaveBeenCalledWith(
                expect.anything(),
                { nodeId: 'root:1', projectId: 'projectId', startPos: null }
            );
            jest.useRealTimers();
        });
    });
});
