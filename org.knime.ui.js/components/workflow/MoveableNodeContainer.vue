<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import throttle from 'raf-throttle';

export default {
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
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapState('application', ['activeProjectId']),
        ...mapState('workflow', ['isDragging', 'deltaMovePosition', 'activeWorkflow']),
        ...mapState('canvas', ['zoomFactor']),

        // Combined position of original position + the dragged amount
        combinedPosition() {
            return {
                x: this.position.x + this.deltaMovePosition.x,
                y: this.position.y + this.deltaMovePosition.y
            };
        },
        
        // returns the amount the object should be translated. This is either the position of the objec, or the position + the dragged amount
        translationAmount() {
            return this.isNodeSelected(this.id) ? this.combinedPosition : this.position;
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
    methods: {
        ...mapActions('selection', ['selectNode', 'deselectNode', 'deselectAllObjects']),
        /**
         * Resets the drag position in the store. This can only happen here, as otherwise the node
         * will be reset to its position before the actual movement of the store happened.
         * @returns {void} nothing to return
         */
        handleMoveFromStore() {
            if (this.isDragging) {
                this.$store.commit('workflow/setDragging', { isDragging: false });
                this.$store.commit('workflow/resetDragPosition');
            }
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
         * throttled to limit recalculation
         * @param {Object} detail - containing the total amount moved in x and y direction
         */
        onMove: throttle(function ({ detail: { clientX, clientY, altKey } }) {
            /* eslint-disable no-invalid-this */
            if (!this.isDragging) {
                return;
            }

            // get absolute coordinates
            const [x, y] = this.screenToCanvasCoordinates([clientX, clientY]);
            const updatedPos = { x, y };

            // adjust the delta using `nodeSize` to make sure the reference is from the center of the node
            const { nodeSize } = this.$shapes;
            let deltaX = updatedPos.x - this.startPos.x - nodeSize / 2;
            let deltaY = updatedPos.y - this.startPos.y - nodeSize / 2;
            
            let gridSize = altKey ? { x: 1, y: 1 } : this.$shapes.gridSize;

            // Adjusted For Grid Snapping
            deltaX = Math.round(deltaX / gridSize.x) * gridSize.x;
            deltaY = Math.round(deltaY / gridSize.y) * gridSize.y;
            
            // prevent unneeded dispatches if the position hasn't changed
            if (this.deltaMovePosition.x !== deltaX || this.deltaMovePosition.y !== deltaY) {
                this.$store.dispatch('workflow/moveNodes', {
                    deltaX,
                    deltaY
                });
            }
            /* eslint-enable no-invalid-this */
        }),

        /**
         * Handles the end of a move event
         *
         * Because the onMove function is throttled we also need to throttle the onMoveEnd
         * function to guarantee order of event handling
         *
         */
        onMoveEnd: throttle(function () {
            /* eslint-disable no-invalid-this */
            this.$store.dispatch('workflow/saveNodeMoves', {
                projectId: this.activeProjectId,
                startPos: this.startPos,
                nodeId: this.id
            });
            /* eslint-enable no-invalid-this */
        })
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
    <slot :position="translationAmount" />
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
