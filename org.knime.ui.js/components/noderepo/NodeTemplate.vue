<script>
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import { KnimeMIME } from '~/mixins/dropNode';

export default {
    components: {
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
            dragGhost: null
        };
    },
    computed: {
        ...mapState('nodeRepository', ['selectedNode']),
        ...mapGetters('workflow', ['isWritable'])
    },
    methods: {
        ...mapActions('panel', ['openDescriptionPanel', 'closeDescriptionPanel']),
        ...mapMutations('nodeRepository', ['setSelectedNode']),
        onDragStart(e) {
            this.closeDescriptionPanel();
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

            // remove cloned node preview
            if (this.dragGhost) {
                document.body.removeChild(this.dragGhost);
                delete this.dragGhost;
            }
        },
        onClick() {
            this.openDescriptionPanel();
            this.setSelectedNode(this.nodeTemplate);
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
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onClick"
    @drag="onDrag"
  >
    <label :title="nodeTemplate.name">{{ nodeTemplate.name }}</label>
    <NodePreview
      ref="nodePreview"
      :class="nodeTemplate === selectedNode ? 'node-preview-active' : 'node-preview'"
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
  height: 75px;
  margin: 0 2px;
  padding-bottom: 42px;
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  text-align: center;

  & label {
    max-height: 26px;
    max-width: 100px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    pointer-events: none;
  }

  & svg {
    width: 70px;
    position: absolute;
    bottom: -15px;
    right: 15px;
  }

  & .node-preview-active {
    filter: url(#node-torso-shadow);
  }

  &:hover {
    cursor: pointer;

    & .node-preview {
      filter: url(#node-torso-shadow);
    }
  }
}
</style>
