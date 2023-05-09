<script>
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';
import throttle from 'raf-throttle';
import { snapToGrid } from '@/util/geometry';

import { escapeStack } from '@/mixins';

export default {
    mixins: [
        escapeStack({
            group: 'NODE_DRAG',
            alwaysActive: true,
            onEscape() {
                if (this.isDragging) {
                    this.$store.dispatch('workflow/abortDrag');
                }
            }
        })
    ],
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
        }
    },
    data: () => ({
        // Start position of the dragging
        startPos: null,
        lastHitTarget: null
    }),
    computed: {
        ...mapGetters('workflow', ['isWritable', 'isNodeConnected', 'getNodeById']),
        ...mapGetters('selection', ['isNodeSelected']),
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapState('workflow', ['movePreviewDelta', 'activeWorkflow', 'hasAbortedDrag', 'isDragging']),

        // Combined position of original position + the dragged amount
        combinedPosition() {
            return {
                x: this.position.x + this.movePreviewDelta.x,
                y: this.position.y + this.movePreviewDelta.y
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
        ...mapMutations('workflow', ['setMovePreview']),
        /**
         * Resets the drag position in the store. This can only happen here, as otherwise the node
         * will be reset to its position before the actual movement of the store happened.
         * @returns {void} nothing to return
         */
        handleMoveFromStore() {
            if (this.isDragging) {
                this.$store.dispatch('workflow/resetDragState');
            }
        },

        /**
         * Handles the start of a move event
         * @param {Object} e - details of the mousedown event
         * @returns {void} nothing to return
         */
        onMoveStart({ detail }) {
            if (!detail.event.shiftKey && !this.isNodeSelected(this.id)) {
                this.deselectAllObjects();
            }
            this.selectNode(this.id);

            const gridAdjustedPosition = {
                x: snapToGrid(this.position.x),
                y: snapToGrid(this.position.y)
            };

            this.startPos = {
                ...gridAdjustedPosition,

                // account for any delta between the current position and its grid-adjusted equivalent.
                // this is useful for nodes that might be not aligned to the grid, so that they can be brought back in
                // during the drag operation
                positionDelta: {
                    x: gridAdjustedPosition.x - this.position.x,
                    y: gridAdjustedPosition.y - this.position.y
                }
            };
            this.$store.commit('workflow/setIsDragging', true);
        },

        /**
         * Handles move events of the node
         * throttled to limit recalculation
         * @param {Object} detail - containing the total amount moved in x and y direction
         */
        onMove: throttle(function ({ detail: { clientX, clientY, altKey } }) {
            /* eslint-disable no-invalid-this */
            if (!this.startPos || this.hasAbortedDrag) {
                return;
            }

            // Notify elements under the cursor
            this.notifyNodeDraggingListeners(clientX, clientY);

            const { nodeSize } = this.$shapes;
            const snapSize = altKey ? 1 : this.$shapes.gridSize.x;

            // get absolute coordinates
            const [canvasX, canvasY] = this.screenToCanvasCoordinates([clientX, clientY]);

            // Adjusted For Grid Snapping
            const deltas = {
                // adjust the deltas using `nodeSize` to make sure the reference is from the center of the node
                x: snapToGrid(canvasX - this.startPos.x - nodeSize / 2, snapSize),
                y: snapToGrid(canvasY - this.startPos.y - nodeSize / 2, snapSize)
            };

            // prevent unneeded dispatches if the position hasn't changed
            if (this.movePreviewDelta.x !== deltas.x || this.movePreviewDelta.y !== deltas.y) {
                this.setMovePreview({
                    // further adjust to snap to grid. e.g if the node had been previously moved
                    // by ignoring the grid we use the start position delta to bring it back to the grid
                    deltaX: deltas.x + this.startPos.positionDelta.x,
                    deltaY: deltas.y + this.startPos.positionDelta.y
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
        onMoveEnd: throttle(function ({ detail: { endX, endY } }) {
            /* eslint-disable no-invalid-this */
            if (this.hasAbortedDrag) {
                this.$store.dispatch('workflow/resetDragState');
                this.$store.dispatch('workflow/resetAbortDrag');

                if (this.lastHitTarget) {
                    this.lastHitTarget.dispatchEvent(
                        new CustomEvent('node-dragging-leave', {
                            bubbles: true,
                            cancelable: true
                        })
                    );
                }
                return;
            }

            if (this.lastHitTarget) {
                this.lastHitTarget.dispatchEvent(
                    new CustomEvent('node-dragging-end', {
                        bubbles: true,
                        cancelable: true,
                        detail: {
                            id: this.id,
                            clientX: endX,
                            clientY: endY,
                            onError: this.moveNode
                        }
                    })
                );
                return;
            }

            this.moveNode();
            /* eslint-enable no-invalid-this */
        }),

        notifyNodeDraggingListeners(posX, posY) {
            const hitTarget = document.elementFromPoint(posX, posY);

            const isSameTarget = hitTarget && this.lastHitTarget === hitTarget;

            if (!isSameTarget && this.lastHitTarget) {
                this.lastHitTarget.dispatchEvent(
                    new CustomEvent('node-dragging-leave', {
                        bubbles: true,
                        cancelable: true
                    })
                );
            }

            if (!isSameTarget && hitTarget) {
                const { inPorts = [], outPorts = [] } = this.getNodeById(this.id);
                const isEventIgnored = hitTarget.dispatchEvent(
                    new CustomEvent('node-dragging-enter', {
                        bubbles: true,
                        cancelable: true,
                        detail: { isNodeConnected: this.isNodeConnected(this.id), inPorts, outPorts }
                    })
                );
                this.lastHitTarget = isEventIgnored ? null : hitTarget;
            }
        },

        moveNode() {
            this.$store.dispatch('workflow/moveObjects', {
                projectId: this.activeProjectId,
                startPos: this.startPos,
                nodeId: this.id
            });
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
    <slot :position="translationAmount" />
  </g>
</template>

<style lang="postcss" scoped>
.dragging {
  cursor: grabbing;
  pointer-events: none;

  & :deep(.port) {
    pointer-events: none;
  }
}
</style>
