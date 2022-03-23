<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { throttle } from 'lodash';
import NodeSelectionPlane from '~/components/workflow/NodeSelectionPlane';

const moveNodesThrottle = 10; // 10 ms between new move calculations are performed
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
        nodeSelectionWidth: null,
        nodeSelectionExtraHeight: 20
    }),
    computed: {
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('selection', ['isNodeSelected']),
        ...mapState('application', {
            projectId: 'activeProjectId'
        }),
        ...mapState('workflow', {
            isDragging: 'isDragging',
            deltaMovePosition: 'deltaMovePosition',
            moveNodeGhostThresholdExceeded: 'moveNodeGhostThresholdExceeded',
            activeWorkflow: 'activeWorkflow'
        }),
        ...mapState('canvas', ['zoomFactor']),
        // Combined position of original position + the dragged amount
        combinedPosition() {
            return { x: this.position.x + this.deltaMovePosition.x, y: this.position.y + this.deltaMovePosition.y };
        },
        // returns the amount the object should be translated. This is either the position of the objec, or the position + the dragged amount
        translationAmount() {
            return this.isNodeSelected(this.id) &&
                !this.moveNodeGhostThresholdExceeded
                ? this.combinedPosition
                : this.position;
        },
        // If true the outline of the node is shown when dragged.
        // This is true if the node is selected and more then a predefined amount of nodes are selected
        // and the node has been moved already
        showGhostOutline() {
            return this.isNodeSelected(this.id) &&
                this.moveNodeGhostThresholdExceeded &&
                (this.deltaMovePosition.x !== 0 || this.deltaMovePosition.y !== 0);
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
    methods: {
        ...mapActions('selection', ['selectNode', 'deselectNode', 'deselectAllObjects']),
        /**
         * Resets the drag position in the store. This can only happen here, as otherwise the node
         * will be reset to its position before the actual movement of the store happened.
         * @returns {void} nothing to return
         */
        handleMoveFromStore() {
            this.$store.commit('workflow/resetDragPosition');
            this.$store.commit('workflow/setDragging', { nodeId: this.id, isDragging: false });
        },

        /**
         * Handles the start of a move event
         * @param {Object} e - details of the mousedown event
         * @returns {void} nothing to return
         */
        onMoveStart(e) {
            this.$store.commit('workflow/setDragging', { nodeId: this.id, isDragging: true });
            if (!e.detail.event.shiftKey && !this.isNodeSelected(this.id)) {
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
        onMove: throttle(function ({ detail: { totalDeltaX, totalDeltaY } }) {
            /* eslint-disable no-invalid-this */
            // Move node to the next rounded grid position
            const { gridSize } = this.$shapes;
            let deltaX = Math.round((this.startPos.x + totalDeltaX / this.zoomFactor) / gridSize.x) *
                gridSize.x - this.position.x;
            let deltaY = Math.round((this.startPos.y + totalDeltaY / this.zoomFactor) / gridSize.y) *
                gridSize.y - this.position.y;
            this.$store.dispatch(
                'workflow/moveNodes',
                { deltaX, deltaY }
            );
            /* eslint-enable no-invalid-this */
        }, moveNodesThrottle),

        /**
         * Handles the end of a move event
         * @returns {void} nothing to return
         */
        onMoveEnd() {
            this.$store.dispatch('workflow/saveNodeMoves', {
                projectId: this.projectId,
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
    v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5, isProtected: !isWritable}"
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
