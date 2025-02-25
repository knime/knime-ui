<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { NodeState } from "@/api/gateway-api/generated-api.ts";
import type { UIExtensionLoadingState } from "@/components/uiExtensions/common/types";
import { usePageBuilder } from "@/composables/usePageBuilder/usePageBuilder.ts";

const props = defineProps<{
  projectId: string;
  workflowId: string;
  nodeId: string;
  executionState?: NodeState.ExecutionStateEnum;
}>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

const shadowHost = ref<HTMLElement | null>(null);

const pageBuilder = await usePageBuilder(props.projectId);

const loadPage = async () => {
  if (props.executionState === NodeState.ExecutionStateEnum.EXECUTED) {
    emit("loadingStateChange", { value: "loading", message: "Loading view" });
    await pageBuilder.loadPage(props.projectId, props.workflowId, props.nodeId);
    emit("loadingStateChange", { value: "ready" });
  }
};
watch(
  () => [props.projectId, props.workflowId, props.nodeId, props.executionState],
  loadPage,
);

const shadowRoot = ref<ShadowRoot | null>(null);

onMounted(async () => {
  emit("loadingStateChange", { value: "loading", message: "Loading view" });
  await loadPage();

  try {
    shadowRoot.value = shadowHost.value!.attachShadow({ mode: "open" });

    pageBuilder.mountShadowApp(shadowRoot.value);

    emit("loadingStateChange", { value: "ready" });
  } catch (error) {
    emit("loadingStateChange", {
      value: "error",
      message: `Failed to initialize PageBuilder: ${(error as Error).message}`,
    });
  }
});

onBeforeUnmount(() => {
  if (shadowRoot.value) {
    pageBuilder?.unmountShadowApp();
    shadowRoot.value.replaceChildren();
  }
});
</script>

<template>
  <div ref="shadowHost" />
</template>
