<script setup lang="ts">
import { getCurrentInstance, ref, watch } from "vue";
import { useStore } from "vuex";

import { NodeState } from "@/api/gateway-api/generated-api.ts";
import type { UIExtensionLoadingState } from "@/components/uiExtensions/common/types";
import { setupPageBuilderEnvironment } from "@/pageBuilderLoader.ts";

const props = defineProps<{
  projectId: string;
  workflowId: string;
  nodeId: string;
  executionState?: NodeState.ExecutionStateEnum;
}>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

const store = useStore();

// Setup the page builder environment if it hasn't been done yet
const pageBuilderSetupComplete = ref(false);
emit("loadingStateChange", { value: "loading", message: "Loading view" });
const instance = getCurrentInstance();
if (instance) {
  const app = instance.appContext.app;
  await setupPageBuilderEnvironment(app, store, props.projectId);
  pageBuilderSetupComplete.value = true;
} else {
  emit("loadingStateChange", {
    value: "error",
    message:
      "ComponentViewLoader: Failed to get current Vue instance. This should not happen.",
  });
}
emit("loadingStateChange", { value: "ready" });

const loadPage = async () => {
  if (
    pageBuilderSetupComplete.value &&
    props.executionState === NodeState.ExecutionStateEnum.EXECUTED
  ) {
    emit("loadingStateChange", { value: "loading", message: "Loading view" });
    await store.dispatch("api/mount", {
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.nodeId,
    });
    emit("loadingStateChange", { value: "ready" });
  }
};
watch(() => props.executionState, loadPage, { immediate: true });
</script>

<template>
  <PageBuilder v-if="pageBuilderSetupComplete" />
</template>
