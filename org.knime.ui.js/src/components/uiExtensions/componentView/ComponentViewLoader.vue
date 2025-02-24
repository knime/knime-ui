<script setup lang="ts">
import { type Ref, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { debounce } from "lodash-es";

import { NodeState } from "@/api/gateway-api/generated-api";
import LoadingIndicator from "@/components/uiExtensions/LoadingIndicator.vue";
import type { UIExtensionLoadingState } from "@/components/uiExtensions/common/types";
import {
  type PageBuilderControl,
  usePageBuilder,
} from "@/composables/usePageBuilder/usePageBuilder";
import { useReexecutingCompositeViewState } from "@/composables/usePageBuilder/useReexecutingCompositeViewState";

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

const shadowHost = ref<HTMLElement | null>(null);
const componentViewIsDirty = ref<boolean>(false);

const DEBOUNCE_TIME = 300;
const getPageBuilder = () =>
  usePageBuilder(props.projectId, (isDirty) => {
    debounce(() => {
      componentViewIsDirty.value = isDirty;
    }, DEBOUNCE_TIME)();
  });

const pageBuilder: Ref<PageBuilderControl> = ref(await getPageBuilder());

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
    componentViewIsDirty.value = false;
    pageBuilder.value.mountShadowApp(shadowRoot.value!);

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

const unmount = () => {
  if (shadowRoot.value) {
    pageBuilder.value?.unmountShadowApp();
    shadowRoot.value.replaceChildren();
  }
};

onBeforeUnmount(unmount);

watch(
  () => [props.projectId, props.workflowId, props.nodeId],
  async () => {
    unmount();
    pageBuilder.value = await getPageBuilder();
    await mount();
  },
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
      useReexecutingCompositeViewState().isReexecuting(props.nodeId)
    "
    :message="'Component is re-executing. Please wait.'"
  />
  <div ref="shadowHost" />
</template>
