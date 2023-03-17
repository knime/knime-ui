<script>
import { mapGetters, mapState, mapActions } from 'vuex';
import throttle from 'raf-throttle';
import { findItemsInsideOfRectangle } from '@/util/rectangleSelection';

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
    emits: ['nodeSelectionPreview', 'annotationSelectionPreview'],
    data: () => ({
        startPos: {
            x: 0,
            y: 0
        },
        endPos: {
            x: 0,
            y: 0
        },
        pointerId: null,
        nodeIdsToSelectOnEnd: [],
        nodeIdsToDeselectOnEnd: [],
        selectedNodeIdsAtStart: [],
        nodeIdsInsidePreviousSelection: [],
        annotationIdsToSelectOnEnd: [],
        annotationIdsToDeselectOnEnd: [],
        selectedAnnotationIdsAtStart: [],
        annotationIdsInsidePreviousSelection: []
    }),
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
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
        this.$bus.on('selection-pointerdown', this.startRectangleSelection);
        this.$bus.on('selection-pointerup', this.stopRectangleSelection);
        this.$bus.on('selection-pointermove', this.updateRectangleSelection);
        this.$bus.on('selection-lostpointercapture', this.stopRectangleSelection);
    },
    beforeUnmount() {
        this.$bus.off('selection-pointerdown', this.startRectangleSelection);
        this.$bus.off('selection-pointerup', this.stopRectangleSelection);
        this.$bus.off('selection-pointermove', this.updateRectangleSelection);
        this.$bus.off('selection-lostpointercapture', this.stopRectangleSelection);
    },
    methods: {
        ...mapActions('selection', [
            'selectNodes',
            'deselectNodes',
            'deselectAllObjects',
            'selectAnnotations',
            'deselectAnnotations'
        ]),

        startRectangleSelection(e) {
            this.pointerId = e.pointerId;
            e.target.setPointerCapture(e.pointerId);
            
            [this.startPos.x, this.startPos.y] = this.screenToCanvasCoordinates([e.clientX, e.clientY]);
            this.endPos = { ...this.startPos };
            
            this.nodeIdsToSelectOnEnd = [];
            this.nodeIdsToDeselectOnEnd = [];

            // deselect all objects if we do not hold shift or control/meta key
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                // remember currently selected nodes, the nodes under the rectangle will inverse them
                this.selectedNodeIdsAtStart = [...this.selectedNodeIds];
            } else {
                // TODO: NXT-978 could mock that for faster start of rectangle selection
                this.deselectAllObjects();
                this.selectedNodeIdsAtStart = [];
            }
        },

        // Because the selection update/move function is throttled we also need to
        // throttle the stop function to guarantee order of event handling
        stopRectangleSelection: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.pointerId !== e.pointerId) {
                return;
            }
            e.target.releasePointerCapture(this.pointerId);

            // hide rect
            this.pointerId = null;

            // update selection (in store)
            setTimeout(() => {
                // do the real selection when we are finished as it is quite slow (updates to buttons, tables etc.)
                if (this.nodeIdsToSelectOnEnd.length > 0) {
                    this.selectNodes(this.nodeIdsToSelectOnEnd);
                }

                if (this.nodeIdsToDeselectOnEnd.length > 0) {
                    this.deselectNodes(this.nodeIdsToDeselectOnEnd);
                }

                if (this.annotationIdsToSelectOnEnd.length > 0) {
                    this.selectAnnotations(this.annotationIdsToSelectOnEnd);
                }

                if (this.annotationIdsToDeselectOnEnd.length > 0) {
                    this.deselectNodes(this.annotationIdsToDeselectOnEnd);
                }

                // clear "preview state" of now selected elements
                [...this.nodeIdsToSelectOnEnd, ...this.nodeIdsToDeselectOnEnd].forEach(nodeId => {
                    this.$emit('nodeSelectionPreview', { type: 'clear', nodeId });
                });

                [...this.annotationIdsToSelectOnEnd, ...this.annotationIdsToDeselectOnEnd].forEach(annotationId => {
                    this.$emit('annotationSelectionPreview', { preview: false, annotationId });
                });

                this.nodeIdsToSelectOnEnd = [];
                this.nodeIdsToDeselectOnEnd = [];
                this.selectedNodeIdsAtStart = [];
                this.annotationIdsToSelectOnEnd = [];
                this.annotationIdsToDeselectOnEnd = [];
                this.selectedAnnotationIdsAtStart = [];
            }, 0);
            /* eslint-enable no-invalid-this */
        }),

        updateRectangleSelection: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.pointerId !== e.pointerId) {
                return;
            }
            
            [this.endPos.x, this.endPos.y] = this.screenToCanvasCoordinates([e.clientX, e.clientY]);
            this.previewSelectionForNodesInRectangle(this.startPos, this.endPos);
            /* eslint-enable no-invalid-this */
        }),

        previewSelectionForNodesInRectangle(startPos, endPos) {
            let { nodesInside, nodesOutside, annotationsInside, annotationsOutside } = findItemsInsideOfRectangle({
                startPos,
                endPos,
                workflow: this.activeWorkflow
            });

            // remember this for the real selection at the end of the movement (pointerup)
            let selectNodes = [];
            let deselectNodes = [];
            let selectAnnotations = [];
            let deselectAnnotations = [];
            // console.log(annotationsInside);

            // do the preview
            nodesInside.forEach(nodeId => {
                // support for shift (remove selection on selected ones)
                if (this.selectedNodeIdsAtStart?.includes(nodeId)) {
                    this.$emit('nodeSelectionPreview', { type: 'hide', nodeId });
                    deselectNodes.push(nodeId);
                } else {
                    this.$emit('nodeSelectionPreview', { type: 'show', nodeId });
                    selectNodes.push(nodeId);
                }
            });

            // As we update the selection, we need to tell every node that is NOW outside
            // the selection AND that it used to be inside the previous selection
            // to clear its selected state
            nodesOutside.forEach(nodeId => {
                if (this.nodeIdsInsidePreviousSelection?.includes(nodeId)) {
                    this.$emit('nodeSelectionPreview', { type: 'clear', nodeId });
                }
            });

            annotationsInside.forEach(annotationId => {
                // support for shift (remove selection on selected annotations)
                if (this.selectedAnnotationIdsAtStart?.includes(annotationId)) {
                    this.$emit('annotationSelectionPreview', { preview: false, annotationId });
                    deselectAnnotations.push(annotationId);
                } else {
                    this.$emit('annotationSelectionPreview', { preview: true, annotationId });
                    selectAnnotations.push(annotationId);
                }
            });

            annotationsOutside.forEach(annotationId => {
                if (this.nodeIdsInsidePreviousSelection?.includes(annotationId)) {
                    this.$emit('annotationSelectionPreview', { preview: false, annotationId });
                }
            });

            this.nodeIdsInsidePreviousSelection = nodesInside;
            this.nodeIdsToSelectOnEnd = selectNodes;
            this.nodeIdsToDeselectOnEnd = deselectNodes;
            this.annotationIdsToSelectOnEnd = selectAnnotations;
            this.annotationIdsToDeselectOnEnd = deselectAnnotations;
        }
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
