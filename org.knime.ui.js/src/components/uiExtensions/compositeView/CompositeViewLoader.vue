<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { API } from "@api";

import { NodeState } from "@/api/gateway-api/generated-api";
import LoadingIndicator from "@/components/uiExtensions/LoadingIndicator.vue";
import type { UIExtensionLoadingState } from "@/components/uiExtensions/common/types";
import {
  type PageBuilderApi,
  useCompositeViewStore,
} from "@/store/compositeView/compositeView";
import type { Identifiers } from "@/store/compositeView/pageBuilderStore";

const props = defineProps<{
  projectId: string;
  workflowId: string;
  nodeId: string;
  executionState?: NodeState.ExecutionStateEnum;
}>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
  pagebuilderHasPage: [hasPage: boolean];
}>();

const currentIdentifier = computed<Identifiers>(() => ({
  projectId: props.projectId,
  workflowId: props.workflowId,
  nodeId: props.nodeId,
}));

const shadowHost = ref<HTMLElement | null>(null);

const { getPageBuilder } = useCompositeViewStore();

const pageBuilder = ref<PageBuilderApi>(await getPageBuilder());

const loadPage = async () => {
  if (props.executionState === NodeState.ExecutionStateEnum.EXECUTED) {
    emit("loadingStateChange", { value: "loading", message: "Loading page" });
    await pageBuilder.value.loadPage(
      props.projectId,
      props.workflowId,
      props.nodeId,
    );
    emit("pagebuilderHasPage", pageBuilder.value.hasPage());
    emit("loadingStateChange", { value: "ready" });
  }
};

const shadowRoot = ref<ShadowRoot | null>(null);

const mount = async () => {
  await loadPage();

  emit("loadingStateChange", { value: "loading", message: "Loading view" });
  try {
    await pageBuilder.value.mountShadowApp(shadowRoot.value!);

    emit("loadingStateChange", { value: "ready" });
  } catch (error) {
    emit("loadingStateChange", {
      value: "error",
      message: `Failed to initialize PageBuilder: ${(error as Error).message}`,
    });
  }
};

onMounted(async () => {
  shadowRoot.value = shadowHost.value!.attachShadow({ mode: "open" });
  await mount();
});

const unmount = async (oldIdentifier?: Identifiers) => {
  if (shadowRoot.value) {
    const deactivationTarget = oldIdentifier ?? currentIdentifier.value;

    try {
      await API.compositeview.deactivateAllCompositeViewDataServices(
        deactivationTarget,
      );
    } catch (error) {
      consola.error(
        `Failed to deactivate component (${deactivationTarget.projectId}/${deactivationTarget.workflowId}/${deactivationTarget.nodeId}) data services.`,
        error,
      );
    }

    pageBuilder.value?.unmountShadowApp();
    shadowRoot.value.replaceChildren();
  }
};

onBeforeUnmount(unmount);

watch(
  currentIdentifier,
  async (_, oldIdentifier) => {
    await unmount(oldIdentifier);
    pageBuilder.value = await getPageBuilder();
    await mount();
  },
  { deep: true },
);

watch(
  () => props.executionState,
  () => !pageBuilder.value.hasPage() && loadPage(),
);
</script>

<template>
  <LoadingIndicator
    v-if="
      !pageBuilder.hasPage() &&
      useCompositeViewStore().isReexecuting(props.nodeId)
    "
    :message="'Component is re-executing. Please wait.'"
  />
  <div ref="shadowHost" />
</template>
