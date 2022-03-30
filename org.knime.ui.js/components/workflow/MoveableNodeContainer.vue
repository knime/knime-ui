<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import throttle from 'raf-throttle';
import NodeSelectionPlane from '~/components/workflow/NodeSelectionPlane';

export default {
    components: {
        NodeSelectionPlane
    },
    props: {
        /**
         * Node id, unique to the containing workflow
         */
        id: { type: String, required: true },

        /**
         * The position of the node. Contains of an x and a y parameter
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },
        /**
         * Node variation.
         * @values 'node', 'metanode', 'component'
         */
        kind: {
            type: String,
            required: true,
            validator: kind => ['node', 'metanode', 'component'].includes(kind)
        }
    },
    data: () => ({
        // Start position of the dragging
        startPos: { x: 0, y: 0 },
        nodeSelectionWidth: 0,
        nodeSelectionExtraHeight: 20
    }),
    computed: {
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('selection', ['isNodeSelected']),
        ...mapGetters('canvas', ['toCanvasCoordinates']),
        ...mapState('application', ['activeProjectId']),
        ...mapState('workflow', [
            'isDragging', 'deltaMovePosition', 'moveNodeGhostThresholdExceeded', 'activeWorkflow'
        ]),
        ...mapState('canvas', ['zoomFactor']),

        // Combined position of original position + the dragged amount
        combinedPosition() {
            return { x: this.position.x + this.deltaMovePosition.x, y: this.position.y + this.deltaMovePosition.y };
        },
        
        // returns the amount the object should be translated. This is either the position of the objec, or the position + the dragged amount
        translationAmount() {
            return this.isNodeSelected(this.id) && !this.moveNodeGhostThresholdExceeded
                ? this.combinedPosition
                : this.position;
        },
        
        // If true the outline of the node is shown when dragged.
        // This is true if the node is selected and more then a predefined amount of nodes are selected
        // and the node has been moved already
        showGhostOutline() {
            return (
                this.isNodeSelected(this.id) &&
                this.moveNodeGhostThresholdExceeded &&
                (this.deltaMovePosition.x !== 0 || this.deltaMovePosition.y !== 0)
            );
        }
    },
    watch: {
        // If change occurs, position has been updated from the store.
        // Note that the position is not updated while the node is being dragged, only after it's dropped.
        position: {
            deep: true,
            handler() {
                this.handleMoveFromStore();
            }
        }
    },
    created() {
        this.$on('node-selection-plane-width-changed', this.updatePlaneWidth);
        this.$on('node-selection-plane-extra-height-changed', this.updatePlaneExtraHeight);
    },
    beforeDestroy() {
        this.$off('node-selection-plane-width-changed', this.updatePlaneWidth);
        this.$off('node-selection-plane-extra-height-changed', this.updatePlaneExtraHeight);
    },
    methods: {
        ...mapActions('selection', ['selectNode', 'deselectNode', 'deselectAllObjects']),
        /**
         * Resets the drag position in the store. This can only happen here, as otherwise the node
         * will be reset to its position before the actual movement of the store happened.
         * @returns {void} nothing to return
         */
        handleMoveFromStore() {
            this.$store.commit('workflow/resetDragPosition');
            this.$store.commit('workflow/setDragging', { isDragging: false });
        },

        positionOnCanvas({ x, y }) {
            const kanvasElement = document.getElementById('kanvas');
            const { offsetLeft, offsetTop, scrollLeft, scrollTop } = kanvasElement;

            const [absoluteX, absoluteY] = this.toCanvasCoordinates([
                x - offsetLeft + scrollLeft,
                y - offsetTop + scrollTop
            ]);

            return { x: absoluteX, y: absoluteY };
        },

        /**
         * Handles the start of a move event
         * @param {Object} e - details of the mousedown event
         * @returns {void} nothing to return
         */
        onMoveStart({ detail }) {
            this.$store.commit('workflow/setDragging', { isDragging: true });
            if (!detail.event.shiftKey && !this.isNodeSelected(this.id)) {
                this.deselectAllObjects();
            }
            this.selectNode(this.id);
            
            this.startPos = { x: this.position.x, y: this.position.y };
        },

        /**
         * Handles move events of the node
         * throttled to limit recalculation to every @moveNodesThrottle ms
         * @param {Object} detail - containing the total amount moved in x and y direction
         */
        onMove: throttle(function ({ detail: { clientX, clientY } }) {
            /* eslint-disable no-invalid-this */
            if (!this.isDragging) {
                return;
            }
            
            const { nodeSize, gridSize } = this.$shapes;
            const updatedPos = this.positionOnCanvas({ x: clientX, y: clientY });

            // adjust the delta using `nodeSize` to make sure the reference is from the center of the node
            const deltaX = updatedPos.x - this.startPos.x - nodeSize / 2;
            const deltaY = updatedPos.y - this.startPos.y - nodeSize / 2;

            const deltaXAdjustedForGridSnapping = Math.round(deltaX / gridSize.x) * gridSize.x;
            const deltaYAdjustedForGridSnapping = Math.round(deltaY / gridSize.y) * gridSize.y;
            
            this.$store.dispatch('workflow/moveNodes', {
                deltaX: deltaXAdjustedForGridSnapping,
                deltaY: deltaYAdjustedForGridSnapping
            });
            /* eslint-enable no-invalid-this */
        }),

        /**
         * Handles the end of a move event
         * @returns {void} nothing to return
         */
        onMoveEnd() {
            this.$store.dispatch('workflow/saveNodeMoves', {
                projectId: this.activeProjectId,
                startPos: this.startPos,
                nodeId: this.id
            });
        },
        updatePlaneWidth(width) {
            this.nodeSelectionWidth = width;
        },
        updatePlaneExtraHeight(extraHeight) {
            this.nodeSelectionExtraHeight = extraHeight;
        }
    }
};
</script>

<template>
  <g
    v-move="{ onMove, onMoveStart, onMoveEnd, isProtected: !isWritable}"
    :transform="`translate(${ translationAmount.x}, ${ translationAmount.y })`"
    :data-node-id="id"
    :class="[{ dragging: isDragging && isNodeSelected(id) }]"
  >
    <slot />
    <NodeSelectionPlane
      v-if="showGhostOutline"
      :position="deltaMovePosition"
      :width="nodeSelectionWidth"
      :extra-height="nodeSelectionExtraHeight"
      :kind="kind"
    />
  </g>
</template>

<style lang="postcss" scoped>
cursor: grabbing;

.dragging {
  & >>> .port {
    pointer-events: none;
  }
}
</style>
