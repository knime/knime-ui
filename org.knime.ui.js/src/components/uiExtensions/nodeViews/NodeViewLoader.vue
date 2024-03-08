<script setup lang="ts">
import { ref, watch, toRef, onUnmounted } from "vue";

import {
  UIExtension,
  type UIExtensionAPILayer,
} from "webapps-common/ui/uiExtensions";

import { API } from "@api";
import type { NativeNode } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";

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
const isLoadingConfig = ref(false);
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

    if (nodeView?.deactivationRequired) {
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

const noop = () => {};

const $toast = getToastsProvider();
const activeToastId = ref<string | null>(null);

const removeActiveToast = () => {
  if (activeToastId.value) {
    $toast.remove(activeToastId.value);
    activeToastId.value = null;
  }
};

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

  updateDataPointSelection: async (params) => {
    const { mode, selection } = params;
    const result = await API.node.updateDataPointSelection({
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.selectedNode.id,
      mode: mode as "add" | "remove" | "replace",
      selection,
    });
    return { result };
  },

  sendAlert: (alert, removeAlertButton) => {
    removeActiveToast();

    const headline = alert.nodeInfo
      ? `${alert.nodeInfo?.nodeName} (${alert.nodeId})`
      : `Warning (${alert.nodeId})`;

    const toastType = alert.type === "warn" ? "warning" : "error";

    removeAlertButton?.();

    activeToastId.value = $toast.show({
      headline,
      message: alert.message,
      type: toastType,
      autoRemove: alert.type !== "error",
    });
  },

  // NOOP - not required by this embedding context for this type of UI Extension
  publishData: noop,
  setReportingContent: noop,
  imageGenerated: noop,
  registerPushEventService: () => noop,
  setSettingsWithCleanModelSettings: noop,
  setDirtyModelSettings: noop,
  onApplied: noop,
};

watch(
  toRef(props, "selectedNode"),
  async () => {
    try {
      error.value = null;
      isLoadingConfig.value = true;

      emit("loadingStateChange", { value: "loading", message: "Loading view" });

      await loadExtensionConfig();

      isLoadingConfig.value = false;
      emit("loadingStateChange", { value: "ready" });
    } catch (_error) {
      error.value = _error;
      isLoadingConfig.value = false;

      emit("loadingStateChange", {
        value: "error",
        message: _error as string,
        error: _error,
      });
    }
  },
  { immediate: true, deep: true },
);

onUnmounted(() => {
  deactivateDataServicesFn?.();
  removeActiveToast();
});
</script>

<template>
  <UIExtension
    v-if="!error && !isLoadingConfig"
    :extension-config="extensionConfig!"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
