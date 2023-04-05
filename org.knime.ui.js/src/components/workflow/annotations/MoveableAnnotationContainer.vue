<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';

import type { Bounds } from '@/api/gateway-api/generated-api';
import throttle from 'raf-throttle';
import { snapToGrid } from '@/util/geometry';

import { getGridAdjustedBounds } from './transform-control-utils';
// import { escapeStack } from '@/mixins';

export default defineComponent({
    props: {
        /**
         * annotation id, unique to the containing workflow
         */
        id: { type: String, required: true },

        position: {
            type: Object as PropType<Bounds>,
            default: () => ({ x: 0, y: 0, width: 0, height: 0 }),
            required: true
        }
    },
    data() {
        return {
            // Start position of the dragging
            startPos: null,
            gridBounds: getGridAdjustedBounds(this.position)
        };
    },
    computed: {
        ...mapGetters('workflow', ['isWritable', 'isDragging']),
        ...mapGetters('selection', ['isAnnotationSelected']),
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapState('workflow', ['movePreviewDelta']),
        ...mapState('canvas', ['zoomFactor']),

        combinedPosition() {
            console.log('position', this.position);
            console.log('inner', this.gridBounds);
            
            console.log('translation', this.translationAmount);
            return {
                x: this.gridBounds.x * 0.01 + this.movePreviewDelta.x,
                y: this.gridBounds.y * 0.01 + this.movePreviewDelta.y
            };
        },

        translationAmount() {
            // this.gridBounds * 0.01
            // return this.isAnnotationSelected(this.id) ? this.combinedPosition : { x: this.position.x * 0.01, y: this.position.y * 0.01 };
            return this.isAnnotationSelected(this.id) ? this.combinedPosition : this.gridBounds * 0.01;
        }
    },
    watch: {
        position: {
            deep: true,
            handler() {
                this.gridBounds = getGridAdjustedBounds(this.position);
                this.handleMoveFromStore();
            }
        }
    },
    methods: {
        ...mapActions('selection', ['selectAnnotation', 'deselectAnnotation', 'deselectAllObjects']),
        ...mapActions('workflow', ['moveObjects']),
        ...mapMutations('workflow', ['setMovePreview', 'resetMovePreview']),

        handleMoveFromStore() {
            if (this.isDragging) {
                this.resetMovePreview();
            }
        },
        
        onMoveStart({ detail }) {
            if (!detail.event.shiftKey && !this.isAnnotationSelected(this.id)) {
                this.deselectAllObjects();
            }
            this.selectAnnotation(this.id);

            this.startPos = {
                x: this.gridBounds.x,
                y: this.gridBounds.y,
                positionDelta: {
                    x: this.gridBounds.x - this.position.x,
                    y: this.gridBounds.y - this.position.y
                }
            };
        },

        onMove: throttle(function ({ detail: { clientX, clientY, altKey } }) {
            const snapSize = altKey ? 1 : this.$shapes.gridSize.x;

            // get absolute coordinates
            const [canvasX, canvasY] = this.screenToCanvasCoordinates([clientX, clientY]);

            // Adjusted For Grid Snapping
            const deltas = {
                x: snapToGrid(canvasX - this.startPos.x - this.gridBounds.width / 2, snapSize),
                y: snapToGrid(canvasY - this.startPos.y - this.gridBounds.height / 2, snapSize)
            };

            if (this.movePreviewDelta.x !== deltas.x || this.movePreviewDelta.y !== deltas.y) {
                this.setMovePreview({
                    deltaX: deltas.x + this.startPos.positionDelta.x,
                    deltaY: deltas.y + this.startPos.positionDelta.y
                });
            }
        }),

        onMoveEnd: throttle(function () {
            this.moveObjects();
        })
    }
    // :transform="`translate(${ translationAmount.x}, ${ translationAmount.y })`"

    // :transform-x="translationAmount.x"
    // :transform-y="translationAmount.y"
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
