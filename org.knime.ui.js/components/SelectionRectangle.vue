<script>
import { mapGetters, mapState, mapMutations, mapActions } from 'vuex';
import { throttle } from 'lodash';

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
    // emits: ['node-selection-preview']
    data: () => ({
        startPos: {
            x: 0,
            y: 0
        },
        endPos: {
            x: 0,
            y: 0
        },
        isActive: false,
        pointerId: null
    }),
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        ...mapGetters('canvas', ['viewBox']),
        ...mapState('canvas', ['zoomFactor']),
        ...mapGetters('selection', ['selectedNodeIds']),

        changeDirectionX() {
            return this.endPos.x - this.startPos.x < 0;
        },
        changeDirectionY() {
            return this.endPos.y - this.startPos.y < 0;
        }
    },
    created() {
        this.$parent.$on('selection-pointerdown', this.startRectSelection);
        this.$parent.$on('selection-pointerup', this.stopRectSelection);
        this.$parent.$on('selection-pointermove', this.mouseMove);
    },
    beforeDestroy() {
        this.$parent.$off('selection-pointerdown', this.startRectSelection);
        this.$parent.$off('selection-pointerup', this.stopRectSelection);
        this.$parent.$off('selection-pointermove', this.mouseMove);
    },
    methods: {
        ...mapMutations('workflow', ['setDragging']),
        ...mapActions('selection', ['selectNodes', 'deselectNodes', 'deselectAllObjects']),
        startRectSelection(e) {
            this.pointerId = e.pointerId;
            if (!e.target.hasPointerCapture(e.pointerId)) {
                e.target.setPointerCapture(e.pointerId);
            }
            e.target.addEventListener('lostpointercapture', this.stopRectSelection);
            this.startPos = this.getCurrentPos(e);

            // deselect all objects if we do not hold shift key
            if (e.shiftKey) {
                // remember currently selected nodes, the nodes under the rect will inverse them
                this.selectedNodeIdsAtStart = [...this.selectedNodeIds];
            } else {
                if (this.selectedNodeIds.length > 0) {
                    this.deselectAllObjects();
                }
                this.selectedNodeIdsAtStart = [];
            }
            this.endPos = this.startPos;
            this.isActive = true;
        },
        stopRectSelection(e) {
            if (!this.isActive || this.pointerId !== e.pointerId) {
                return;
            }
            e.target.removeEventListener('lostpointercapture', this.stopRectSelection);
            e.target.releasePointerCapture(this.pointerId);

            // hide rect
            this.isActive = false;
            this.pointerId = null;

            // update selection (in store)
            setTimeout(() => {
                // do the real selection if we are finished as it is quite slow (updates to buttons, tables etc.)
                this.selectNodes(this.selectOnEnd);
                this.deselectNodes(this.deSelectOnEnd);

                // clear preview state of now selected elements
                [...this.selectOnEnd, ...this.deSelectOnEnd].forEach(
                    nodeId => this.emitNodeSelectionPreview('clear', nodeId)
                );

                // clear state
                this.selectOnEnd = [];
                this.deSelectOnEnd = [];
                this.selectedNodeIdsAtStart = [];
            }, 0);
        },
        mouseMove(e) {
            if (!this.isActive || this.pointerId !== e.pointerId) {
                return;
            }
            this.endPos = this.getCurrentPos(e);
            this.$nextTick(() => this.previewSelectionForNodesInRectangle(this.startPos, this.endPos));
        },
        getOffsetOnKanvas(e) {
            // we need to use the offset relative to the kanvas not the element it occurred (which might be a descendant)
            let currentTargetRect = e.currentTarget.getBoundingClientRect();
            return {
                offsetX: e.pageX - currentTargetRect.left,
                offsetY: e.pageY - currentTargetRect.top
            };
        },
        getCurrentPos(e) {
            const { offsetX, offsetY } = this.getOffsetOnKanvas(e);
            return {
                x: this.viewBox.left + offsetX / this.zoomFactor,
                y: this.viewBox.top + offsetY / this.zoomFactor
            };
        },
        findNodesInsideOfRect(startPos, endPos) {
            let inside = [];
            let outside = [];
            Object.values(this.activeWorkflow.nodes).forEach(node => {
                const { nodeSize } = this.$shapes;
                let nodeIsInsideOfRect = false;
                if (node.position.x + nodeSize > startPos.x && node.position.x < endPos.x &&
                    node.position.y + nodeSize > startPos.y && node.position.y < endPos.y) {
                    nodeIsInsideOfRect = true;
                } else if (node.position.x < startPos.x && node.position.x + nodeSize > endPos.x &&
                    node.position.y < startPos.y && node.position.y + nodeSize > endPos.y) {
                    nodeIsInsideOfRect = true;
                } else if (node.position.x + nodeSize > startPos.x && node.position.x < endPos.x &&
                    node.position.y < startPos.y && node.position.y + nodeSize > endPos.y) {
                    nodeIsInsideOfRect = true;
                } else if (node.position.x < startPos.x && node.position.x + nodeSize > endPos.x &&
                    node.position.y + nodeSize > startPos.y && node.position.y < endPos.y) {
                    nodeIsInsideOfRect = true;
                }
                // create lists with node ids
                if (nodeIsInsideOfRect) {
                    inside.push(node.id);
                } else {
                    outside.push(node.id);
                }
            });
            return {
                inside,
                outside
            };
        },
        emitNodeSelectionPreview(type, nodeId) {
            this.$emit('node-selection-preview', { type, nodeId });
        },
        previewSelectionForNodesInRectangle: throttle(function (startPos, endPos) {
            let { inside, outside } = this.findNodesInsideOfRect(startPos, endPos);

            // remember this for the real selection at the end of the movement (pointerup)
            let selectNodes = [];
            let deselectNodes = [];

            // do the preview
            inside.forEach(nodeId => {
                // support for shift (remove selection on selected ones)
                if (this.selectedNodeIdsAtStart?.includes(nodeId)) {
                    this.emitNodeSelectionPreview('hide', nodeId);
                    deselectNodes.push(nodeId);
                } else {
                    this.emitNodeSelectionPreview('show', nodeId);
                    selectNodes.push(nodeId);
                }
            });
            // clear state if we have changed it in the last run
            outside.forEach(nodeId => {
                if (this.lastInsideNodeIds?.includes(nodeId)) {
                    this.emitNodeSelectionPreview('clear', nodeId);
                }
            });
            // update global state
            this.lastInsideNodeIds = [...inside];
            this.selectOnEnd = [...selectNodes];
            this.deSelectOnEnd = [...deselectNodes];
        }, SELECTION_PREVIEW_THROTTLE)
    }
};
</script>

<template>
  <rect
    v-show="isActive"
    :x="(!changeDirectionX ? startPos.x : endPos.x)"
    :y="!changeDirectionY ? startPos.y : endPos.y"
    :width="Math.abs(!changeDirectionX ? endPos.x - startPos.x : startPos.x - endPos.x)"
    :height="Math.abs(!changeDirectionY ? endPos.y - startPos.y : startPos.y - endPos.y)"
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
