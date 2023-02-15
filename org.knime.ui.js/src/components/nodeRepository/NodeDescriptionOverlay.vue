<script>
import { mapActions } from 'vuex';
import { escapeStack } from '@/mixins/escapeStack';
import NodeDescription from '@/components/nodeRepository/NodeDescription.vue';
import CloseButton from '@/components/common/CloseButton.vue';

/**
 * NodeDescription + close button, esc close + overlay/extension sidebar styling
 */
export default {
    components: {
        CloseButton,
        NodeDescription
    },
    mixins: [
        escapeStack({
            onEscape() {
                this.closeDescriptionPanel();
            }
        })
    ],
    props: {
        selectedNode: {
            type: Object,
            default: null,
            validator: node => node === null || (typeof node.nodeFactory?.className === 'string' &&
                typeof node.name === 'string')
        }
    },
    methods: {
        ...mapActions('nodeRepository', ['closeDescriptionPanel'])
    }
};
</script>

<template>
  <NodeDescription
    class="node-description-overlay"
    :selected-node="selectedNode"
  >
    <template #header-action>
      <CloseButton
        class="close-button"
        @close="closeDescriptionPanel"
      />
    </template>
  </NodeDescription>
</template>

<style lang="postcss" scoped>
.node-description-overlay {
  width: 360px;
  background-color: var(--knime-gray-ultra-light);
  position: fixed;
  left: 400px;
  z-index: 2;
  border: solid var(--knime-silver-sand);
  border-width: 0 1px;
  height: calc(100% - (var(--app-header-height) + var(--app-toolbar-height)));

  /* fix height of scroll container */
  & >>> .scroll-container {
    height: calc(100% - 34px);
  }

  & .close-button {
    margin-top: 2px;
    margin-right: -15px;
  }
}
</style>
