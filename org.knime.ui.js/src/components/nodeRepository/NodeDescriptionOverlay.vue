<script>
import { mapActions, mapGetters, mapState } from "vuex";
import { escapeStack } from "@/mixins/escapeStack";
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";
import CloseButton from "@/components/common/CloseButton.vue";
import { TABS } from "@/store/panel";

/**
 * NodeDescription + close button, esc close + overlay/extension sidebar styling
 */
export default {
  components: {
    CloseButton,
    NodeDescription,
  },
  mixins: [
    escapeStack({
      onEscape() {
        this.closeDescriptionPanel();
      },
    }),
  ],
  computed: {
    ...mapGetters("nodeRepository", {
      isSelectedNodeVisible: "isSelectedNodeVisible",
    }),
    ...mapState("panel", ["activeTab"]),
    ...mapState("application", ["activeProjectId"]),
    ...mapState("nodeRepository", ["selectedNode"]),

    activeNode() {
      const isNodeRepositoryActive =
        this.activeTab[this.activeProjectId] === TABS.NODE_REPOSITORY;

      if (!isNodeRepositoryActive) {
        return this.selectedNode;
      }

      return this.isSelectedNodeVisible ? this.selectedNode : null;
    },
  },
  methods: {
    ...mapActions("nodeRepository", ["closeDescriptionPanel"]),
  },
};
</script>

<template>
  <NodeDescription class="node-description-overlay" :selected-node="activeNode">
    <template #header-action>
      <CloseButton class="close-button" @close="closeDescriptionPanel" />
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
  & :deep(.scroll-container) {
    height: calc(100% - 34px);
  }

  & .close-button {
    margin-top: 2px;
    margin-right: -15px;
  }
}
</style>
