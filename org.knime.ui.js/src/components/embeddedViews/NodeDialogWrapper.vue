<script>
import { mapGetters, mapState } from "vuex";
import NodeDialogLoader from "./NodeDialogLoader.vue";

export default {
  components: {
    NodeDialogLoader,
  },

  computed: {
    ...mapState("application", { projectId: "activeProjectId" }),
    ...mapState("workflow", {
      workflowId: (state) => state.activeWorkflow.info.containerId,
    }),
    ...mapGetters("selection", { selectedNode: "singleSelectedNode" }),

    placeholder() {
      if (!this.selectedNode) {
        return "Please select a node";
      }

      if (this.selectedNode && !this.selectedNode.hasDialog) {
        return "Node dialog cannot be displayed. Please open the configuration from the action bar";
      }

      return null;
    },
  },
};
</script>

<template>
  <div class="node-dialog-wrapper">
    <NodeDialogLoader
      v-if="selectedNode && selectedNode.hasDialog"
      :project-id="projectId"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
    />

    <div v-if="placeholder" class="placeholder-container">
      <div class="placeholder">
        {{ placeholder }}
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.node-dialog-wrapper {
  height: 100%;

  & :deep(.dialog) {
    height: calc(100vh - var(--app-header-height) - var(--app-toolbar-height));
    padding-top: 0;
  }
}

.placeholder-container {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;

  & .placeholder {
    padding: 0 15px;
    text-align: center;
  }
}
</style>
