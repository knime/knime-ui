<script>
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import { KnimeMIME } from '~/mixins/dropNode';
import PlusIcon from '~/webapps-common/ui/assets/img/icons/plus.svg?inline';
import ActionButton from '~/components/workflow/ActionButton';

export default {
    components: {
        PlusIcon,
        ActionButton,
        NodePreview
    },
    props: {
        nodeTemplate: {
            type: Object,
            default: null
        }
    },
    data() {
        return {
            isHover: false,
            dragGhost: null,
            restoreDescriptionPanel: false
        };
    },
    computed: {
        ...mapState('nodeRepository', ['selectedNode']),
        ...mapState('panel', ['activeDescriptionPanel']),
        ...mapState('canvas', { canvasSize: 'containerSize' }),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('canvas', ['toCanvasCoordinates']),

        isSelected() {
            return this.selectedNode && this.nodeTemplate.id === this.selectedNode.id;
        }
    },
    methods: {
        ...mapActions('panel', ['openDescriptionPanel', 'closeDescriptionPanel']),
        ...mapMutations('nodeRepository', ['setSelectedNode', 'setDraggingNode']),
        ...mapActions('workflow', { addNodeToWorkflow: 'addNode' }),
        onDragStart(e) {
            // close description panel
            this.restoreDescriptionPanel = this.activeDescriptionPanel;
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

            if (this.restoreDescriptionPanel) {
                this.openDescriptionPanel();
            }
        },
        onClick(e) {
            if (e.detail > 1) {
                return;
            }
            if (this.isSelected) {
                this.setSelectedNode(null);
            } else {
                this.setSelectedNode(this.nodeTemplate);
            }
        },
        addNodeToCenterOfWorkflow() {
            if (this.isWritable) {
                const nodeFactory = this.nodeTemplate.nodeFactory;
                const halfNodeSize = this.$shapes.nodeSize / 2;
                const { clientWidth, clientHeight, scrollLeft, scrollTop } = document.getElementById('kanvas');
                // position at center of canvas
                const position = this.toCanvasCoordinates([
                    clientWidth / 2 + scrollLeft - halfNodeSize,
                    clientHeight / 2 + scrollTop - halfNodeSize
                ]);
                this.addNodeToWorkflow({ position, nodeFactory });
            }
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
    @mouseenter="isHover = true"
    @mouseleave="isHover = false"
    @drag="onDrag"
  >
    <svg
      v-if="isHover"
      class="add-action-button"
    >
      <ActionButton
        @click="addNodeToCenterOfWorkflow"
      >
        <PlusIcon />
      </ActionButton>
    </svg>
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
