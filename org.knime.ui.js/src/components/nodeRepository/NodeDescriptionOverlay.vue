<script>
import { mapActions } from 'vuex';
import { escapeStack } from '@/mixins/escapeStack';
import NodeDescription from '@/components/nodeRepository/NodeDescription.vue';
import CloseIcon from '@/assets/cancel.svg';

/**
 * NodeDescription + close button, esc close + overlay/extension sidebar styling
 */
export default {
    components: {
        NodeDescription,
        CloseIcon
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
      <button
        class="close"
        @click="closeDescriptionPanel"
      >
        <CloseIcon class="icon" />
      </button>
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

  & button.close {
    width: 40px;
    margin-top: 2px;
    margin-right: -15px;
    border: none;
    display: flex;
    align-items: center;
    background-color: transparent;

    & .icon {
      border: 0;
      border-radius: 20px;
      stroke: var(--knime-dove-gray);
      width: 40px;

      &:hover {
        cursor: pointer;
        background-color: var(--knime-silver-sand-semi);
        stroke: var(--knime-masala);
      }
    }
  }
}
</style>
