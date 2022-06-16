<script>
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import { KnimeMIME } from '~/mixins/dropNode';
import findFreeSpaceOnCanvas from '~/util/findFreeSpaceOnCanvas';

const WORKFLOW_ADD_START_PERCENT_X = 0.3; // 0, 0 means top left corner
const WORKFLOW_ADD_START_PERCENT_Y = 0.2; // 0.5, 0.5 means center of canvas
export const WORKFLOW_ADD_START_MIN = 390; // px keep in sync with size of NodeDescription (360 + margin)

export default {
    components: {
        NodePreview
    },
    props: {
        /**
         * Additional to the properties of the NodeTemplate from the gateway API, this object
         * contains the port information (color and kind) which was mapped from the store
         */
        nodeTemplate: {
            type: Object,
            default: null
        }
    },
    data() {
        return {
            isHover: false,
            dragGhost: null,
            shouldSelectOnAbort: false
        };
    },
    computed: {
        ...mapState('nodeRepository', ['selectedNode', 'isDescriptionPanelOpen']),
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('canvas', ['toCanvasCoordinates']),

        isSelected() {
            return this.selectedNode && this.nodeTemplate.id === this.selectedNode.id;
        }
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
            this.dragGhost = this.$refs.nodePreview.$el.cloneNode(true);

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
                delete this.dragGhost;
            }

            // ending with dropEffect none indicates that dragging has been aborted
            if (e.dataTransfer.dropEffect === 'none') { this.onDragAbort(); }
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
            let position = this.toCanvasCoordinates([
                positionX + scrollLeft - halfNodeSize,
                clientHeight * WORKFLOW_ADD_START_PERCENT_Y + scrollTop - halfNodeSize
            ]);

            position = findFreeSpaceOnCanvas(position, this.workflow.nodes);

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
  <div
    class="node"
    draggable="true"
    :class="{ 'selected': isSelected }"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onClick"
    @dblclick="onDoubleClick"
    @drag="onDrag"
  >
    <label :title="nodeTemplate.name">{{ nodeTemplate.name }}</label>
    <NodePreview
      ref="nodePreview"
      class="node-preview"
      :type="nodeTemplate.type"
      :in-ports="nodeTemplate.inPorts"
      :out-ports="nodeTemplate.outPorts"
      :icon="nodeTemplate.icon"
    />
  </div>
</template>

<style lang="postcss" scoped>

.node {
  width: 100px;
  height: 78px;
  margin: 0 2px;
  padding-bottom: 47px;
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  text-align: center;

  & label {
    max-height: 26px;
    max-width: 90px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    pointer-events: none;
  }

  & .node-preview {
    padding-bottom: 6px;
  }

  & svg {
    width: 70px;
    position: absolute;
    bottom: -15px;
    right: 15px;
  }

  & .add-action-button {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50px;
    right: 0;
    overflow: visible;
    width: auto;
  }

  &:hover {
    cursor: pointer;

    & .node-preview {
      filter: url(#node-torso-shadow);
    }
  }
}

.selected {
  /* outline with border-radius is not working properly in Safari and CEF */
  box-shadow: 0 0 0 calc(var(--selected-node-stroke-width-shape) * 1px) var(--selection-active-border-color);
  border-radius: calc(var(--selected-node-border-radius-shape) * 1px);
  background-color: var(--selection-active-background-color);
}
</style>
