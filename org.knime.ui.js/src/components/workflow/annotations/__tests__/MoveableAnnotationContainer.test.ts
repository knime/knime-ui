import { describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/utils';

import type { Bounds } from '@/api/gateway-api/generated-api';
import { directiveMove } from '@/plugins/directive-move';
import * as $shapes from '@/style/shapes.mjs';
import MoveableAnnotationContainer from '../MoveableAnnotationContainer.vue';

describe('MoveableAnnotationContainer.vue', () => {
    const defaultProps: { id: String, bounds: Bounds } = {
        id: 'id1',
        bounds: { x: 500, y: 200, width: 100, height: 100 }
    };

    const doMount = ({
        props = {},
        mocks = {},
        isDraggingMock = vi.fn().mockReturnValue(false),
        isAnnotationSelectedMock = vi.fn().mockReturnValue(() => false),
        screenToCanvasCoordinatesMock = vi.fn().mockReturnValue(() => [0, 0])
    } = {}) => {
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

        const $store = mockVuexStore({
            workflow: {
                state: {
                    activeWorkflow: {
                        projectId: 'project1',
                        info: { containerId: 'root' }
                    },
                    isDragging: isDraggingMock,
                    movePreviewDelta: { x: 250, y: 250 }
                },
                getters: {
                    isWritable: vi.fn().mockReturnValue(() => false)
                },
                actions: {
                    moveObjects: vi.fn()
                },
                mutations: {
                    setMovePreview: vi.fn(),
                    resetMovePreview: vi.fn(),
                    setIsDragging: vi.fn()
                }
            },
            selection: {
                getters: {
                    isAnnotationSelected: isAnnotationSelectedMock
                },
                actions: {
                    selectAnnotation: vi.fn(),
                    deselectAllObjects: vi.fn()
                }
            },
            canvas: {
                getters: {
                    screenToCanvasCoordinates: screenToCanvasCoordinatesMock
                }
            }
        });

        const dispatchSpy = vi.spyOn($store, 'dispatch');
        const commitSpy = vi.spyOn($store, 'commit');

        const wrapper = mount(MoveableAnnotationContainer, {
            props: { ...defaultProps, ...props },
            global: {
                mocks: { $shapes, ...mocks },
                plugins: [$store],
                directives: {
                    [directiveMove.name]: mockMoveDirective
                }
            }
        });

        return { wrapper, $store, mockMoveDirective, dispatchSpy, commitSpy };
    };

    describe('moving', () => {
        it('renders at right position', () => {
            const { wrapper } = doMount();
            const transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe('translate(0, 0)');
        });

        it('deselects all objects on movement of unselected annotation', async () => {
            const { dispatchSpy, mockMoveDirective } = doMount();

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
            await flushPromises();

            expect(dispatchSpy).toHaveBeenCalledWith('selection/deselectAllObjects', undefined);
            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
        });

        it('does not deselect annotation when annotation is already selected', () => {
            const { dispatchSpy, mockMoveDirective } = doMount({
                isAnnotationSelectedMock: vi.fn().mockReturnValue(() => true)
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

            expect(dispatchSpy).not.toHaveBeenCalledWith('selection/deselectAllObjects', undefined);
            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
        });

        it.each([
            ['without grid', { x: 1, y: 1 }, true],
            ['with grid', $shapes.gridSize, false]
        ])('moves an annotation %s', async (_, gridSize, altKey) => {
            const kanvasMock = document.createElement('div');
            kanvasMock.id = 'kanvas';
            document.body.appendChild(kanvasMock);

            const initialNodePosition = { x: 500, y: 200 };
            const positionAfterMove = {
                x: initialNodePosition.x + 100,
                y: initialNodePosition.y + 100
            };

            const { commitSpy, mockMoveDirective, wrapper } = doMount({
                isDraggingMock: vi.fn().mockReturnValue(true),
                screenToCanvasCoordinatesMock: vi.fn().mockReturnValue(() => [positionAfterMove.x, positionAfterMove.y])
            });

            const moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    event: { shiftKey: false, offsetX: 0, offsetY: 0 }
                }
            });
            mockMoveDirective.trigger('onMoveStart', moveStartEvent);
            await flushPromises();
            expect(commitSpy).toHaveBeenCalledWith('workflow/setIsDragging', true, undefined);

            wrapper.find('g').trigger('pointerdown', {
                offsetX: 0,
                offsetY: 0
            });

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
                x: positionAfterMove.x - initialNodePosition.x,
                y: positionAfterMove.y - initialNodePosition.y
            };

            const expectedDelta = {
                deltaX: Math.round(initialDelta.x / gridSize.x) * gridSize.x,
                deltaY: Math.round(initialDelta.y / gridSize.y) * gridSize.y
            };

            expect(commitSpy).toHaveBeenCalledWith('workflow/setMovePreview', expectedDelta, undefined);
        });

        it('ends movement of an annotation', () => {
            vi.useFakeTimers();
            const { wrapper, dispatchSpy } = doMount();

            wrapper.vm.onMoveEnd();

            vi.advanceTimersByTime(5000);

            vi.runOnlyPendingTimers();
            expect(dispatchSpy).toHaveBeenCalledWith('workflow/moveObjects', undefined);
            vi.useRealTimers();
        });
    });
});
