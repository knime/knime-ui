<script>
import { mapGetters, mapState, mapMutations, mapActions } from 'vuex';
import { throttle } from 'lodash';

const moveNodesThrottle = 10; // 10 ms between new move calculations are performed
export default {
    data: () => ({
        startPos: {},
        endPos: {},
        isDragging: false,
        selectedNodesAtStart: [],
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
        this.$parent.$on('pointerdown', this.startDragging);
        this.$parent.$on('pointerup', this.stopDragging);
        this.$parent.$on('pointermove', this.mouseMove);
    },
    methods: {
        ...mapMutations('workflow', ['setDragging']),
        ...mapActions('selection', ['selectNode', 'deselectNode', 'deselectAllObjects']),
        startDragging(e) {
            this.pointerId = e.pointerId;
            if (!e.target.hasPointerCapture(e.pointerId)) {
                e.target.setPointerCapture(e.pointerId);
            }
            this.startPos = {
                x: this.viewBox.left + e.offsetX / this.zoomFactor,
                y: this.viewBox.top + e.offsetY / this.zoomFactor
            };
            // deselect all objects if we do not hold shift key
            if (!e.shiftKey) {
                this.deselectAllObjects();
            }
            // remember currently selected nodes, the nodes under the rect will inverse them
            this.selectedNodesAtStart = [...this.selectedNodeIds];
            this.endPos = this.startPos;
            this.isDragging = true;
        },
        stopDragging(e) {
            this.isDragging = false;
            this.selectedNodesAtStart = [];
            setTimeout(() => {
                this.setDragging(false);
                delete this.pointerId;
            }, 0);
        },
        mouseMove: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.isDragging) {
                this.setDragging(true);
                this.endPos = {
                    x: this.viewBox.left + e.offsetX / this.zoomFactor,
                    y: this.viewBox.top + e.offsetY / this.zoomFactor
                };
                this.$nextTick(() => this.selectAllNodesInRectangle(this.startPos, this.endPos));
            }
            /* eslint-enable no-invalid-this */
        }, moveNodesThrottle),
        selectAllNodesInRectangle(startPos, endPos) {
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
                this.updateSelection(node.id, nodeIsInsideOfRect);
            });
        },
        updateSelection(nodeId, nodeIsInsideOfRect) {
            if (this.selectedNodesAtStart.includes(nodeId)) {
                if (nodeIsInsideOfRect) {
                    this.deselectNode(nodeId);
                } else {
                    this.selectNode(nodeId);
                }
            } else {
                // eslint-disable-next-line no-lonely-if
                if (nodeIsInsideOfRect) {
                    this.selectNode(nodeId);
                } else {
                    this.deselectNode(nodeId);
                }
            }
        }
    }
};
</script>

<template>
  <rect
    v-if="isDragging"
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
