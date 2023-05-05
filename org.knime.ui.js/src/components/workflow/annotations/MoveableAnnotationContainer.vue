<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';
import throttle from 'raf-throttle';

import type { Bounds } from '@/api/gateway-api/generated-api';
import { snapToGrid } from '@/util/geometry';

import { getGridAdjustedBounds } from './transform-control-utils';

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
            gridBounds: getGridAdjustedBounds(this.bounds),
            cursorPosition: null
        };
    },
    computed: {
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('selection', ['isAnnotationSelected']),
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapState('workflow', ['movePreviewDelta', 'isDragging', 'hasAbortedNodeDrag']),

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
                this.gridBounds = getGridAdjustedBounds(this.bounds);
                this.handleMoveFromStore();
            }
        }
    },
    methods: {
        ...mapActions('selection', ['selectAnnotation', 'deselectAllObjects']),
        ...mapActions('workflow', ['moveObjects']),
        ...mapMutations('workflow', [
            'setMovePreview',
            'resetMovePreview',
            'setIsDragging',
            'setHasAbortedNodeDrag'
        ]),

        handleMoveFromStore() {
            if (this.isDragging) {
                this.resetMovePreview();
                this.setIsDragging(false);
            }
        },

        async onMoveStart({ detail }) {
            if (!detail.event.shiftKey && !this.isAnnotationSelected(this.id)) {
                await this.deselectAllObjects();
            }

            await this.selectAnnotation(this.id);
            this.cursorPosition = {
                x: detail.event.offsetX,
                y: detail.event.offsetY
            };

            this.startPos = {
                x: this.gridBounds.x,
                y: this.gridBounds.y,
                positionDelta: {
                    x: this.gridBounds.x - this.bounds.x,
                    y: this.gridBounds.y - this.bounds.y
                }
            };

            this.setIsDragging(true);
        },

        onMove: throttle(function (this: any, { detail: { clientX, clientY, altKey } }) {
            /* eslint-disable no-invalid-this */
            if (this.hasAbortedNodeDrag) {
                return;
            }

            const snapSize = altKey ? 1 : this.$shapes.gridSize.x;
            const [canvasX, canvasY] = this.screenToCanvasCoordinates([clientX, clientY]);

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
            if (this.hasAbortedNodeDrag) {
                this.setHasAbortedNodeDrag(false);
                this.$store.commit('workflow/setIsDragging', false);
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
    v-move="{ onMoveStart, onMove, onMoveEnd, isProtected: !isWritable}"
    :transform="`translate(${ translationAmount.x}, ${ translationAmount.y })`"
    :class="[{ dragging: isDragging && isAnnotationSelected(id) }]"
  >
    <slot />
  </g>
</template>

<style lang="postcss" scoped>
.dragging {
  cursor: grabbing;
}
</style>
