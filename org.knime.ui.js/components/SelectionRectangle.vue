<script>
import { mapGetters, mapState, mapActions } from 'vuex';
import { throttle } from 'lodash';
import { findNodesInsideOfRectangle } from '~/util/rectangleSelection';

const SELECTION_PREVIEW_THROTTLE = 10; // delay between new move calculations/previews are performed in ms
/**
 * SelectionRectangle - select multiple nodes by drawing a rectangle with by mouse (pointer) movement
 *
 * This component registers to the `selection-pointer{up,down,move} of its parent (the Kanvas).
 * It also uses the parent for several other things. The vue event @node-selection-preview is used for a fast selection
 * preview. This is caused by the slowness of the Vuex store. The WorkflowPanel forwards those events to the Workflow
 * which calls the Node (via $refs) to show a selection preview. We know that this is not very vue-ish and data should
 * define what is rendered, but that's too slow in this case.
 */
export default {
    data: () => ({
        startPos: {
            x: 0,
            y: 0
        },
        endPos: {
            x: 0,
            y: 0
        },
        pointerId: null
    }),
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        ...mapGetters('canvas', ['toCanvasCoordinates']),
        ...mapGetters('selection', ['selectedNodeIds']),
        selectionBounds() {
            const { endPos, startPos } = this;

            return {
                x: Math.min(startPos.x, endPos.x),
                y: Math.min(startPos.y, endPos.y),

                width: Math.abs(startPos.x - endPos.x),
                height: Math.abs(startPos.y - endPos.y)
            };
        }
    },
    created() {
        this.$parent.$on('selection-pointerdown', this.startRectangleSelection);
        this.$parent.$on('selection-pointerup', this.stopRectangleSelection);
        this.$parent.$on('selection-pointermove', this.updateRectangleSelection);
        this.$parent.$on('selection-lostpointercapture', this.stopRectangleSelection);
    },
    beforeDestroy() {
        this.$parent.$off('selection-pointerdown', this.startRectangleSelection);
        this.$parent.$off('selection-pointerup', this.stopRectangleSelection);
        this.$parent.$off('selection-pointermove', this.updateRectangleSelection);
        this.$parent.$off('selection-lostpointercapture', this.stopRectangleSelection);
    },
    methods: {
        ...mapActions('selection', ['selectNodes', 'deselectNodes', 'deselectAllObjects']),

        startRectangleSelection(e) {
            this.pointerId = e.pointerId;
            e.target.setPointerCapture(e.pointerId);
            this.startPos = this.positionOnCanvas(e);
            this.endPos = this.startPos;
            // init non-reactive data
            this.selectOnEnd = [];
            this.deSelectOnEnd = [];

            // deselect all objects if we do not hold shift key
            if (e.shiftKey) {
                // remember currently selected nodes, the nodes under the rectangle will inverse them
                this.selectedNodeIdsAtStart = [...this.selectedNodeIds];
            } else {
                // TODO: could mock that for faster start of rectangle selection
                this.deselectAllObjects();
                this.selectedNodeIdsAtStart = [];
            }
        },

        stopRectangleSelection(e) {
            if (this.pointerId !== e.pointerId) {
                return;
            }
            e.target.releasePointerCapture(this.pointerId);

            // hide rect
            this.pointerId = null;

            // update selection (in store)
            setTimeout(() => {
                // do the real selection when we are finished as it is quite slow (updates to buttons, tables etc.)
                if (this.selectOnEnd) {
                    this.selectNodes(this.selectOnEnd);
                }
                if (this.deSelectOnEnd) {
                    this.deselectNodes(this.deSelectOnEnd);
                }

                // clear preview state of now selected elements
                [...this.selectOnEnd, ...this.deSelectOnEnd].forEach(nodeId => {
                    this.$emit('node-selection-preview', { type: 'clear', nodeId });
                });

                // clear state
                this.selectOnEnd = [];
                this.deSelectOnEnd = [];
                this.selectedNodeIdsAtStart = [];
            }, 0);
        },

        updateRectangleSelection: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.pointerId !== e.pointerId) {
                return;
            }

            let pointerOnCanvas = this.positionOnCanvas(e);
            this.endPos = pointerOnCanvas;

            this.$nextTick(() => {
                this.previewSelectionForNodesInRectangle(this.startPos, pointerOnCanvas);
            });
            /* eslint-enable no-invalid-this */
        }),

        positionOnCanvas(e) {
            // we need to use the offset relative to the kanvas not the element it occurred (which might be a descendant)
            let currentTargetRect = e.currentTarget.getBoundingClientRect();
            const offsetX = e.pageX - currentTargetRect.left;
            const offsetY = e.pageY - currentTargetRect.top;

            // convert to kanvas coordinates
            const [x, y] = this.toCanvasCoordinates([offsetX, offsetY]);
            return { x, y };
        },

        /* eslint-disable no-invalid-this */
        previewSelectionForNodesInRectangle: throttle(function (startPos, endPos) {
            let { inside, outside } = findNodesInsideOfRectangle({
                startPos,
                endPos,
                workflow: this.activeWorkflow
            });

            // remember this for the real selection at the end of the movement (pointerup)
            let selectNodes = [];
            let deselectNodes = [];

            // do the preview
            inside.forEach(nodeId => {
                // support for shift (remove selection on selected ones)
                if (this.selectedNodeIdsAtStart?.includes(nodeId)) {
                    this.$emit('node-selection-preview', { type: 'hide', nodeId });
                    deselectNodes.push(nodeId);
                } else {
                    this.$emit('node-selection-preview', { type: 'show', nodeId });
                    selectNodes.push(nodeId);
                }
            });

            // clear state if we have changed it in the last run
            outside.forEach(nodeId => {
                if (this.lastInsideNodeIds?.includes(nodeId)) {
                    this.$emit('node-selection-preview', { type: 'clear', nodeId });
                }
            });

            // update global state
            this.lastInsideNodeIds = inside;
            this.selectOnEnd = selectNodes;
            this.deSelectOnEnd = deselectNodes;
        }, SELECTION_PREVIEW_THROTTLE)
        /* eslint-enable no-invalid-this */
    }
};
</script>

<template>
  <rect
    v-show="pointerId !== null"
    :x="selectionBounds.x"
    :y="selectionBounds.y"
    :width="selectionBounds.width"
    :height="selectionBounds.height"
    :stroke="$colors.selection.activeBorder"
    stroke-dasharray="5"
    vector-effect="non-scaling-stroke"
  />
</template>

<style lang="postcss" scoped>
rect {
  fill: none;
  stroke-width: 1;
}
</style>
