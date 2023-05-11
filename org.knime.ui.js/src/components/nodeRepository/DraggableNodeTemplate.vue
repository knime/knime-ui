<script>
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import { KnimeMIME } from '@/mixins/dropNode';
import NodeTemplate from '@/components/nodeRepository/NodeTemplate.vue';
import { geometry } from '@/util/geometry';

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
        isHighlighted: {
            type: Boolean,
            default: false
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
        ...mapGetters('canvas', ['getVisibleFrame'])
    },
    methods: {
        ...mapMutations('nodeRepository', ['setSelectedNode']),
        ...mapActions('nodeRepository', ['openDescriptionPanel', 'closeDescriptionPanel', 'setDraggingNodeTemplate']),
        ...mapActions('workflow', { addNodeToWorkflow: 'addNode' }),

        onDragStart(e) {
            // close description panel
            this.shouldSelectOnAbort = this.isSelected && this.isDescriptionPanelOpen;
            this.closeDescriptionPanel();
            this.setDraggingNodeTemplate(this.nodeTemplate);

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
            this.setDraggingNodeTemplate(null);

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
            const position = geometry.findFreeSpaceAroundCenterWithFallback({
                visibleFrame: this.getVisibleFrame(),
                nodes: this.workflow.nodes
            });

            const nodeFactory = this.nodeTemplate.nodeFactory;
            this.addNodeToWorkflow({ position, nodeFactory });
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
    :is-highlighted="isHighlighted"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onClick"
    @dblclick="onDoubleClick"
    @drag="onDrag"
  />
</template>
