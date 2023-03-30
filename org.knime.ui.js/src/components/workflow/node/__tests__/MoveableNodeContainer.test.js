import { expect, describe, it, vi } from 'vitest';
import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/utils';

import { escapeStack as escapeStackMock } from '@/mixins/escapeStack';
import * as $shapes from '@/style/shapes.mjs';
import { directiveMove } from '@/plugins/directive-move';

import MoveableNodeContainer from '../MoveableNodeContainer.vue';

const commonNode = {
    id: 'root:1',
    kind: 'node',

    position: { x: 500, y: 200 },
    selected: false
};

vi.mock('@/mixins/escapeStack', () => {
    function escapeStack({ onEscape }) { // eslint-disable-line func-style
        escapeStack.onEscape = onEscape;
        return { /* empty mixin */ };
    }
    return { escapeStack };
});

describe('MoveableNodeContainer', () => {
    const doMount = ({
        props = {},
        isNodeSelected = vi.fn(() => false),
        screenToCanvasCoordinates = () => [0, 0],
        isDragging = false
    } = {}) => {
        const defaultProps = {
            ...commonNode,
            selected: true,
            allowedActions: { canExecute: true, canOpenDialog: true, canOpenView: false },
            state: { executionState: 'IDLE' }
        };

        const createMockMoveDirective = () => {
            let handlers = {};

            return {
                mounted(el, bindings) {
                    handlers = bindings.value;
                },
                trigger(eventName, event) {
                    handlers[eventName]?.(event);
                }
            };
        };

        const mockMoveDirective = createMockMoveDirective();

        const actions = {
            workflow: { moveObjects: vi.fn() },
            selection: {
                deselectAllObjects: vi.fn(),
                selectNode: vi.fn()
            }
        };

        const mutations = {
            workflow: {
                resetMovePreview: vi.fn(),
                setMovePreview: vi.fn()
            }
        };

        // TODO: Refactor -> Mock less and use the real store for more reliable tests
        const storeConfig = {
            workflow: {
                mutations: {
                    ...mutations.workflow,
                    setHasAbortedNodeDrag(state, val) {
                        state.hasAbortedNodeDrag = val;
                    },
                    setIsDragging(state, val) {
                        state.isDragging = val;
                    }
                },
                getters: {
                    isWritable() {
                        return true;
                    }
                },
                actions: actions.workflow,
                state: {
                    isDragging,
                    movePreviewDelta: { x: 250, y: 250 },
                    activeWorkflow: { nodes: { 'root:1': { id: 'root:1' }, 'root:2': { id: 'root:2' } } },
                    hasAbortedNodeDrag: false
                }
            },
            canvas: {
                state: { zoomFactor: 1 },
                getters: { screenToCanvasCoordinates: () => screenToCanvasCoordinates }
            },
            application: {
                state() {
                    return { activeProjectId: 'projectId' };
                }
            },
            selection: {
                getters: { isNodeSelected: () => isNodeSelected },
                actions: actions.selection
            }
        };
        const $store = mockVuexStore(storeConfig);
        const wrapper = shallowMount(MoveableNodeContainer, {
            props: { ...defaultProps, ...props },
            global: {
                mocks: { $shapes },
                plugins: [$store],
                directives: {
                    [directiveMove.name]: mockMoveDirective
                }
            }
        });

        return { wrapper, $store, actions, mutations, mockMoveDirective };
    };

    describe('moving', () => {
        it('renders at right position', () => {
            const { wrapper } = doMount();
            const transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe('translate(500, 200)');
        });

        it('deselects nodes on movement of unselected node', () => {
            const { actions, mockMoveDirective } = doMount();

            const moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    startX: 199,
                    startY: 199,
                    event: {
                        shiftKey: false
                    }
                }
            });

            mockMoveDirective.trigger('onMoveStart', moveStartEvent);

            expect(actions.selection.deselectAllObjects).toHaveBeenCalled();
            expect(actions.selection.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('does not deselect nodes when node is already selected', () => {
            const { actions, mockMoveDirective } = doMount({
                props: { id: 'root:2' },
                isNodeSelected: vi.fn(() => true)
            });

            const moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    startX: 199,
                    startY: 199,
                    event: {
                        shiftKey: false
                    }
                }
            });

            mockMoveDirective.trigger('onMoveStart', moveStartEvent);

            expect(actions.selection.deselectAllObjects).not.toHaveBeenCalled();
            expect(actions.selection.selectNode).toHaveBeenCalledWith(
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

            const { mutations, mockMoveDirective } = doMount({
                isDragging: true,
                screenToCanvasCoordinates: vi.fn(() => [positionAfterMove.x, positionAfterMove.y])
            });

            const moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    event: { shiftKey: false }
                }
            });
            mockMoveDirective.trigger('onMoveStart', moveStartEvent);

            const moveEvent = new CustomEvent('moving', {
                detail: {
                    clientX: 250,
                    clientY: 250,
                    altKey,
                    e: { detail: { event: { shiftKey: false } } }
                }
            });

            mockMoveDirective.trigger('onMove', moveEvent);

            const initialDelta = {
                x: positionAfterMove.x - initialNodePosition.x - $shapes.nodeSize / 2,
                y: positionAfterMove.y - initialNodePosition.y - $shapes.nodeSize / 2
            };

            const expectedDelta = {
                deltaX: Math.round(initialDelta.x / gridSize.x) * gridSize.x,
                deltaY: Math.round(initialDelta.y / gridSize.y) * gridSize.y
            };

            expect(mutations.workflow.setMovePreview).toHaveBeenCalledWith(
                expect.anything(),
                expectedDelta
            );
        });

        it('ends movement of a node', async () => {
            vi.useFakeTimers();
            const { wrapper, actions } = doMount();

            wrapper.vm.onMoveEnd();

            vi.advanceTimersByTime(5000);
            await Vue.nextTick();

            vi.runOnlyPendingTimers();
            expect(actions.workflow.moveObjects).toHaveBeenCalledWith(
                expect.anything(),
                { nodeId: 'root:1', projectId: 'projectId', startPos: null }
            );
            vi.useRealTimers();
        });
    });

    it('should abort moving a node when Esc is pressed', () => {
        const { wrapper, mutations, $store, mockMoveDirective } = doMount({
            isDragging: true
        });
        escapeStackMock.onEscape.call(wrapper.vm);

        expect(mutations.workflow.setMovePreview).toHaveBeenCalledWith(
            expect.anything(),
            { deltaX: 0, deltaY: 0 }
        );
        expect($store.state.workflow.hasAbortedNodeDrag).toBe(true);

        const moveEvent = new CustomEvent('moving', {
            detail: {
                clientX: 250,
                clientY: 250,
                e: { detail: { event: { shiftKey: false } } }
            }
        });
        mockMoveDirective.trigger('onMove', moveEvent);

        // drag was aborted, so the move preview must have only been reset, but moving node is now cancelled
        expect(mutations.workflow.setMovePreview).not.toHaveBeenCalledTimes(2);

        mockMoveDirective.trigger('onMoveEnd', {});

        expect($store.state.workflow.hasAbortedNodeDrag).toBe(false);
    });
});
