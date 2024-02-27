<script setup lang="ts">
import { defineAsyncComponent, computed } from "vue";
import { useStore } from "vuex";
import SidebarContentLoading from "./SidebarContentLoading.vue";

const store = useStore();

const projectId = computed(() => store.state.application.activeProjectId);
const workflowId = computed(
  () => store.state.workflow.activeWorkflow.info.containerId,
);
const selectedNode = computed(
  () => store.getters["selection/singleSelectedNode"],
);

const NodeDialogLoader = defineAsyncComponent({
  loader: () =>
    import("@/components/uiExtensions/nodeDialogs/NodeDialogLoader.vue"),
  loadingComponent: SidebarContentLoading,
});
</script>

<template>
  <div class="panel">
    <NodeDialogLoader
      :project-id="projectId"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.panel {
  display: flex;
  width: 100%;
  height: 100%;

  & :deep(.ui-ext-shadow-app) {
    width: 100%;
    overflow-y: scroll;
  }
}
</style>
