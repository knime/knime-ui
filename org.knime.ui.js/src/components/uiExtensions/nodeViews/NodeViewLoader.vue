<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from "vue";

import type { Alert } from "@knime/ui-extension-service";
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
  alert: [value: Alert | null];
}>();

const error = ref<any>(null);
const isLoadingConfig = ref(false);
const extensionConfig = ref<ExtensionConfig | null>(null);

let deactivateDataServicesFn: () => void;

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const loadExtensionConfig = async () => {
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

  sendAlert: (alert) => {
    consola.log("Alert received for NodeView :>> ", alert);
    emit("alert", alert);
  },

  // NOOP - not required by this embedding context for this type of UI Extension
  publishData: noop,
  setReportingContent: noop,
  imageGenerated: noop,
  registerPushEventService: () => noop,
  onDirtyStateChange: noop,
  onApplied: noop,
};

const renderKey = computed(
  () => `${props.selectedNode.id}_${props.selectedNode.state?.executionState}`,
);

watch(
  renderKey,
  async () => {
    try {
      error.value = null;
      isLoadingConfig.value = true;
      // clear any existing alert emitted from a previous render or view
      emit("alert", null);

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
