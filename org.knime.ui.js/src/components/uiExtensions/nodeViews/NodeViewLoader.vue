<script setup lang="ts">
import { ref, watch, toRef, onMounted, onUnmounted } from "vue";

import {
  UIExtension,
  type UIExtensionAPILayer,
} from "webapps-common/ui/uiExtensions";

import { API } from "@api";
import type { NativeNode } from "@/api/gateway-api/generated-api";

import { useResourceLocation } from "../common/useResourceLocation";
import type { ExtensionConfig, UIExtensionLoadingState } from "../common/types";

/**
 * Renders a node view
 */

type Props = {
  projectId: string;
  workflowId: string;
  selectedNode: NativeNode;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

const error = ref<any>(null);
const isConfigReady = ref(false);
const isLoading = ref(false);
const extensionConfig = ref<ExtensionConfig | null>(null);

let deactivateDataServicesFn: () => void;

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const loadExtensionConfig = async () => {
  if (!props.selectedNode) {
    return;
  }

  try {
    const nodeId = props.selectedNode.id;

    const nodeView = await API.node.getNodeView({
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId,
    });

    if (nodeView.deactivationRequired) {
      deactivateDataServicesFn = () => {
        API.node.deactivateNodeDataServices({
          projectId: props.projectId,
          workflowId: props.workflowId,
          nodeId,
          extensionType: "view",
        });
      };
    }

    extensionConfig.value = nodeView;
  } catch (error) {
    consola.log("Error loading view content", error);
    throw error;
  }
};

watch(toRef(props, "selectedNode"), async () => {
  error.value = null;
  isLoading.value = true;
  emit("loadingStateChange", { value: "loading", message: "Loading view" });

  await loadExtensionConfig();

  emit("loadingStateChange", { value: "ready" });

  isLoading.value = false;
});

const noop = () => {};

const apiLayer: UIExtensionAPILayer = {
  getResourceLocation: (path: string) => {
    return Promise.resolve(
      resourceLocationResolver(
        path,
        extensionConfig.value?.resourceInfo?.baseUrl,
      ),
    );
  },

  callNodeDataService: async (params) => {
    const { serviceType, dataServiceRequest } = params;
    const result = await API.node.callNodeDataService({
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.selectedNode.id,
      extensionType: "view",
      serviceType,
      dataServiceRequest,
    });
    return { result };
  },

  updateDataPointSelection: () => {
    // TODO: impl with NXT-2383 https://knime-com.atlassian.net/browse/NXT-2383
    return Promise.resolve(null);
  },

  // NOOP - not required by this embedding context for this type of UI Extension
  publishData: noop,
  setReportingContent: noop,
  imageGenerated: noop,
  registerPushEventService: () => noop,
  sendAlert: noop,
  setSettingsWithCleanModelSettings: noop,
  setDirtyModelSettings: noop,
  onApplied: noop,
};

onMounted(async () => {
  try {
    emit("loadingStateChange", { value: "loading", message: "Loading view" });

    await loadExtensionConfig();

    isConfigReady.value = true;
    emit("loadingStateChange", { value: "ready" });
  } catch (_error) {
    error.value = _error;
    // TODO: improve error type checking
    emit("loadingStateChange", {
      value: "error",
      message: _error as string,
      error: _error,
    });
  }
});

onUnmounted(() => {
  deactivateDataServicesFn?.();
});
</script>

<template>
  <UIExtension
    v-if="!error && isConfigReady && !isLoading"
    :extension-config="extensionConfig!"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
