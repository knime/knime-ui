<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import { throttle } from 'lodash';
import NodeSelectionPlane from '~/components/NodeSelectionPlane';

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
        startPos: { x: 0, y: 0 }
    }),
    computed: {
        ...mapGetters('workflow', ['isWritable', 'selectedNodes']),
        ...mapState('openedProjects', {
            projectId: 'activeId'
        }),
        ...mapState('workflow', {
            isDragging: 'isDragging',
            deltaMovePosition: 'deltaMovePosition',
            moveNodeGhostTresholdExceeded: 'moveNodeGhostTresholdExceeded'
        }),
        ...mapState('canvas', ['zoomFactor']),
        // Returns if the current node is selected
        isSelected() {
            return this.selectedNodes.filter(node => node.id === this.id).length > 0;
        },
        // Combined position of original position + the dragged amount
        combinedPosition() {
            return { x: this.position.x + this.deltaMovePosition.x, y: this.position.y + this.deltaMovePosition.y };
        },
        // returns the amount the object should be translated. This is either the position of the objec, or the position + the dragged amount
        translationAmount() {
            return this.isSelected && !this.moveNodeGhostTresholdExceeded ? this.combinedPosition : this.position;
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
        ...mapMutations('workflow', ['selectNode', 'deselectNode', 'deselectAllNodes']),
        ...mapGetters('canvas', ['getGridSize']),
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
            if (!e.detail.event.shiftKey && !this.isSelected) {
                this.deselectAllNodes();
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
            let deltaX = Math.round((this.startPos.x + totalDeltaX / this.zoomFactor) / this.getGridSize().x) *
                this.getGridSize().x - this.position.x;
            let deltaY = Math.round((this.startPos.y + totalDeltaY / this.zoomFactor) / this.getGridSize().y) *
                this.getGridSize().y - this.position.y;
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
        }
    }
};
</script>

<template>
  <g
    v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5, isProtected: !isWritable}"
    :transform="`translate(${ translationAmount.x}, ${ translationAmount.y })`"
    :data-node-id="id"
    :class="[{ dragging: isDragging && isSelected }]"
  >
    <slot />
    <NodeSelectionPlane
      v-if="isSelected && moveNodeGhostTresholdExceeded && (deltaMovePosition.x !== 0 || deltaMovePosition.y !== 0)"
      :position="deltaMovePosition"
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
