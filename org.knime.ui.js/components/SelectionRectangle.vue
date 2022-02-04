<script>
import { mapGetters, mapState, mapMutations, mapActions } from 'vuex';
import { throttle } from 'lodash';

const selectNodesAfterMoveThrottle = 50; // delay between new move calculations are performed in ms
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
        isActive: false,
        selectedNodeIdsAtStart: [],
        pointerId: null,
        lastInsideNodeIds: [],
        selectOnEnd: [],
        deSelectOnEnd: [],
        nodeElementMap: {}
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
    methods: {
        ...mapMutations('workflow', ['setDragging']),
        ...mapActions('selection', ['selectNodes', 'deselectNodes', 'deselectAllObjects', 'setSelectedNodes']),
        startRectSelection(e) {
            this.pointerId = e.pointerId;
            if (!e.target.hasPointerCapture(e.pointerId)) {
                e.target.setPointerCapture(e.pointerId);
            }
            this.startPos = {
                x: this.viewBox.left + e.offsetX / this.zoomFactor,
                y: this.viewBox.top + e.offsetY / this.zoomFactor
            };
            this.setDragging(true);
            // remember all nodes as dom elements
            document.querySelectorAll('.the-node')?.forEach(n => {
                this.nodeElementMap[n.getAttribute('id')] = n;
            });
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
            // hide rect
            this.isActive = false;
            this.pointerId = null;

            this.$nextTick(() => {
                // do the real selection
                this.selectNodes(this.selectOnEnd);
                this.deselectNodes(this.deSelectOnEnd);

                // clear preview state of now selected elements
                [...this.selectOnEnd, ...this.deSelectOnEnd].forEach(nodeId => this.sendEventToNode('clear', nodeId));

                // clear state
                this.selectOnEnd = [];
                this.deSelectOnEnd = [];
                this.selectedNodeIdsAtStart = [];
                this.nodeElementMap = {};
            });
            // workflows dragging state changes behavior of nodes
            this.setDragging(false);
        },
        mouseMove(e) {
            if (!this.isActive || this.pointerId !== e.pointerId) {
                return;
            }
            this.endPos = {
                x: this.viewBox.left + e.offsetX / this.zoomFactor,
                y: this.viewBox.top + e.offsetY / this.zoomFactor
            };
            this.$nextTick(() => this.selectAllNodesInRectangle(this.startPos, this.endPos));
        },
        findNodesToSelect(startPos, endPos) {
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
        sendEventToNode(type, nodeId) {
            this.nodeElementMap[`node-${nodeId}`]?.dispatchEvent(
                new CustomEvent(`${type}-selection-preview`, {
                    bubbles: false,
                    cancelable: false
                })
            );
        },
        selectAllNodesInRectangle: throttle(function (startPos, endPos) {
            console.time('find-inside-outside');
            let { inside, outside } = this.findNodesToSelect(startPos, endPos);
            console.timeEnd('find-inside-outside');

            // remember this for the real selection at the end of the movement (pointerup)
            let selectNodes = [];
            let deselectNodes = [];

            // do the preview
            console.time('preview');
            inside.forEach(nodeId => {
                // support for shift (remove selection on selected ones)
                if (this.selectedNodeIdsAtStart.includes(nodeId)) {
                    this.sendEventToNode('hide', nodeId);
                    deselectNodes.push(nodeId);
                } else {
                    this.sendEventToNode('show', nodeId);
                    selectNodes.push(nodeId);
                }
            });
            // clear state if we have changed it in the last run
            outside.forEach(nodeId => {
                if (this.lastInsideNodeIds.includes(nodeId)) {
                    this.sendEventToNode('clear', nodeId);
                }
            });
            // update global state
            this.lastInsideNodeIds = [...inside];
            this.selectOnEnd = [...selectNodes];
            this.deSelectOnEnd = [...deselectNodes];
            console.timeEnd('preview');
        }, selectNodesAfterMoveThrottle)
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
    :stroke-dasharray="5 / zoomFactor"
  />
</template>

<style lang="postcss" scoped>
rect {
  fill: none;
  stroke-width: 1;
}
</style>
