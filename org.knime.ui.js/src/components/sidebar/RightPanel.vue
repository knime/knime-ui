<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";
import NodeDialogLoader from "@/components/uiExtensions/nodeDialogs/NodeDialogLoader.vue";

const store = useStore();

const projectId = computed(() => store.state.application.activeProjectId);
const workflowId = computed(
  () => store.state.workflow.activeWorkflow.info.containerId,
);
const selectedNode = computed(
  () => store.getters["selection/singleSelectedNode"],
);
const showNodeDialog = computed(() => Boolean(selectedNode.value?.hasDialog));
const placeholder = computed(() => {
  if (selectedNode.value && !selectedNode.value.hasDialog) {
    return "Node dialog cannot be displayed. Please open the configuration from the action bar";
  }

  return "Please select a node";
});
</script>

<template>
  <div class="panel">
    <NodeDialogLoader
      v-if="showNodeDialog"
      :project-id="projectId"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
    />
    <div v-else class="placeholder">
      <span class="placeholder-text">{{ placeholder }}</span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--knime-gray-ultra-light);

  & .placeholder {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;

    & .placeholder-text {
      padding: 0 15px;
      text-align: center;
    }
  }
}
</style>
