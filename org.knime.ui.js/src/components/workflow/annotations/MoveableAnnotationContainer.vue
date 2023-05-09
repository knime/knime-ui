<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';
import throttle from 'raf-throttle';

import type { Bounds } from '@/api/gateway-api/generated-api';

import { snapToGrid } from '@/util/geometry';

export default defineComponent({
    props: {
        id: {
            type: String,
            required: true
        },

        bounds: {
            type: Object as PropType<Bounds>,
            default: () => ({ x: 0, y: 0, width: 0, height: 0 }),
            required: true
        }
    },
    data() {
        return {
            startPos: null,
            cursorPosition: null
        };
    },
    computed: {
        ...mapState('workflow', ['movePreviewDelta', 'isDragging', 'hasAbortedDrag']),
        ...mapState('canvas', ['zoomFactor']),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapGetters('selection', ['isAnnotationSelected']),

        combinedPosition() {
            return {
                x: 0 + this.movePreviewDelta.x,
                y: 0 + this.movePreviewDelta.y
            };
        },

        translationAmount() {
            return this.isAnnotationSelected(this.id) ? this.combinedPosition : { x: 0, y: 0 };
        }
    },
    watch: {
        // If change occurs, position has been updated from the store.
        // Note that the position is not updated while the node is being dragged, only after it's dropped.
        bounds: {
            deep: true,
            handler() {
                this.handleMoveFromStore();
            }
        }
    },
    methods: {
        ...mapActions('selection', ['selectAnnotation', 'deselectAllObjects']),
        ...mapActions('workflow', ['moveObjects']),
        ...mapMutations('workflow', ['setMovePreview', 'setIsDragging']),

        handleMoveFromStore() {
            if (this.isDragging) {
                this.$store.dispatch('workflow/resetDragState');
            }
        },

        initCursorPosition(event: PointerEvent) {
            // eslint-disable-next-line no-extra-parens
            const rect = (this.$refs.container as HTMLElement).getBoundingClientRect();

            this.cursorPosition = {
                x: Math.floor(event.clientX - rect.left) / this.zoomFactor,
                y: Math.floor(event.clientY - rect.top) / this.zoomFactor
            };
        },

        async onMoveStart({ detail }) {
            if (!detail.event.shiftKey && !this.isAnnotationSelected(this.id)) {
                await this.deselectAllObjects();
            }

            await this.selectAnnotation(this.id);

            const gridAdjustedPosition = {
                x: snapToGrid(this.bounds.x),
                y: snapToGrid(this.bounds.y)
            };

            this.startPos = {
                x: gridAdjustedPosition.x,
                y: gridAdjustedPosition.y,

                positionDelta: {
                    x: gridAdjustedPosition.x - this.bounds.x,
                    y: gridAdjustedPosition.y - this.bounds.y
                }
            };

            this.setIsDragging(true);
        },

        onMove: throttle(function (this: any, { detail: { event, altKey } }) {
            /* eslint-disable no-invalid-this */
            if (this.hasAbortedDrag) {
                return;
            }

            const [canvasX, canvasY] = this.screenToCanvasCoordinates([
                event.clientX,
                event.clientY
            ]);

            const snapSize = altKey ? 1 : this.$shapes.gridSize.x;

            const deltas = {
                x: snapToGrid(canvasX - this.startPos.x - this.cursorPosition.x, snapSize),
                y: snapToGrid(canvasY - this.startPos.y - this.cursorPosition.y, snapSize)
            };

            if (this.movePreviewDelta.x !== deltas.x || this.movePreviewDelta.y !== deltas.y) {
                this.setMovePreview({
                    deltaX: deltas.x + this.startPos.positionDelta.x,
                    deltaY: deltas.y + this.startPos.positionDelta.y
                });
            }
            /* eslint-enable no-invalid-this */
        }),

        onMoveEnd: throttle(function (this: any) {
            /* eslint-disable no-invalid-this */
            if (this.hasAbortedDrag) {
                this.$store.dispatch('workflow/resetDragState');
                this.$store.dispatch('workflow/resetAbortDrag');
                return;
            }

            this.moveObjects();
            /* eslint-enable no-invalid-this */
        })
    }
});
</script>

<template>
  <g
    ref="container"
    v-move="{ onMoveStart, onMove, onMoveEnd, isProtected: !isWritable}"
    :transform="`translate(${ translationAmount.x}, ${ translationAmount.y })`"
    :class="[{ dragging: isDragging && isAnnotationSelected(id) }]"
    @pointerdown.left.stop="initCursorPosition"
  >
    <slot />
  </g>
</template>

<style lang="postcss" scoped>
.dragging {
  cursor: grabbing;
}
</style>
