<script>
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import { KnimeMIME } from '@/mixins/dropNode';
import findFreeSpaceOnCanvas from '@/util/findFreeSpaceOnCanvas';
import NodeTemplate from '@/components/nodeRepository/NodeTemplate.vue';

const WORKFLOW_ADD_START_PERCENT_X = 0.3; // 0, 0 means top left corner
const WORKFLOW_ADD_START_PERCENT_Y = 0.2; // 0.5, 0.5 means center of canvas
export const WORKFLOW_ADD_START_MIN = 390; // px keep in sync with size of NodeDescription (360 + margin)

/**
 * This component was ripped out of NodeTemplate to make NodeTemplate re-useable. This makes still heavy use of the
 * store and might be further improved by emitting events and let the parents handle the store actions.
 */
export default {
    components: {
        NodeTemplate
    },
    props: {
        nodeTemplate: {
            type: Object,
            default: null
        },
        isSelected: {
            type: Boolean,
            default: false
        },
        index: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            dragGhost: null,
            shouldSelectOnAbort: false
        };
    },
    computed: {
        ...mapState('nodeRepository', ['isDescriptionPanelOpen']),
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('canvas', ['toCanvasCoordinates'])
    },
    methods: {
        ...mapMutations('nodeRepository', ['setSelectedNode', 'setDraggingNode']),
        ...mapActions('nodeRepository', ['openDescriptionPanel', 'closeDescriptionPanel']),
        ...mapActions('workflow', { addNodeToWorkflow: 'addNode' }),

        onDragStart(e) {
            // close description panel
            this.shouldSelectOnAbort = this.isSelected && this.isDescriptionPanelOpen;
            this.closeDescriptionPanel();
            this.setDraggingNode(true);

            // Fix for cursor style for Firefox
            if (!this.isWritable && (navigator.userAgent.indexOf('Firefox') !== -1)) {
                e.currentTarget.style.cursor = 'not-allowed';
            }
            // clone node preview
            this.dragGhost = this.$refs.nodeTemplate.getNodePreview().$el.cloneNode(true);

            // position it outside the view of the user
            this.dragGhost.style.position = 'absolute';
            this.dragGhost.style.left = '-100px';
            this.dragGhost.style.top = '0px';
            this.dragGhost.style.width = '70px';
            this.dragGhost.style.height = `70px`;
            document.body.appendChild(this.dragGhost);

            // this ensures no other element (like the name) will be part of the drag-ghost bitmap
            const dragGhostRect = this.dragGhost.getBoundingClientRect();

            // 'screenshot' cloned node for use as drag-ghost. position it, s.th. cursor is in the middle
            e.dataTransfer.setDragImage(this.dragGhost, dragGhostRect.width / 2, dragGhostRect.height / 2);

            e.dataTransfer.setData('text/plain', this.nodeTemplate.id);
            e.dataTransfer.setData(KnimeMIME, JSON.stringify(this.nodeTemplate.nodeFactory));
        },
        onDragEnd(e) {
            e.target.removeAttribute('style');
            this.setDraggingNode(false);

            // remove cloned node preview
            if (this.dragGhost) {
                document.body.removeChild(this.dragGhost);
                this.dragGhost = null;
            }

            // ending with dropEffect none indicates that dragging has been aborted
            if (e.dataTransfer.dropEffect === 'none') {
                this.onDragAbort();
            }
        },
        onDragAbort() {
            // if drag is aborted and node was selected before, select it again
            if (this.shouldSelectOnAbort) {
                this.setSelectedNode(this.nodeTemplate);
                this.openDescriptionPanel();
            }
        },
        onClick() {
            if (!this.isSelected) {
                this.setSelectedNode(this.nodeTemplate);
            }
            if (!this.isDescriptionPanelOpen) {
                this.openDescriptionPanel();
            }
        },
        onDoubleClick() {
            if (!this.isWritable) {
                return; // end here
            }

            // canvas start position
            const halfNodeSize = this.$shapes.nodeSize / 2;
            const { clientWidth, clientHeight, scrollLeft, scrollTop } = document.getElementById('kanvas');
            const positionX = Math.max(clientWidth * WORKFLOW_ADD_START_PERCENT_X, WORKFLOW_ADD_START_MIN);
            const position = this.toCanvasCoordinates([
                positionX + scrollLeft - halfNodeSize,
                clientHeight * WORKFLOW_ADD_START_PERCENT_Y + scrollTop - halfNodeSize
            ]);

            const [x, y] = findFreeSpaceOnCanvas(position, this.workflow.nodes);

            const nodeFactory = this.nodeTemplate.nodeFactory;
            this.addNodeToWorkflow({ position: { x, y }, nodeFactory });
        },
        onDrag(e) {
            if (!this.isWritable) {
                e.currentTarget.style.cursor = 'not-allowed';
            }
        }
    }
};
</script>

<template>
  <NodeTemplate
    ref="nodeTemplate"
    draggable="true"
    :node-template="nodeTemplate"
    :is-selected="isSelected"
    :index="index"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onClick"
    @dblclick="onDoubleClick"
    @drag="onDrag"
  />
</template>
