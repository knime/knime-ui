<script setup lang="ts">
import { ref, toRefs, watch, onUnmounted } from "vue";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "webapps-common/ui/uiExtensions";

import { API } from "@api";
import type { NativeNode } from "@/api/gateway-api/generated-api";

import type { ExtensionConfig, UIExtensionLoadingState } from "../common/types";
import { useResourceLocation } from "../common/useResourceLocation";
import { useUniqueNodeConfigStateId } from "../common/useUniqueNodeConfigStateId";
import { useNodeConfigAPI } from "../common/useNodeConfigAPI";

/**
 * Dynamically loads a component that will render a Node's configuration dialog
 */
interface Props {
  projectId: string;
  workflowId: string;
  selectedNode: NativeNode;
}

const props = defineProps<Props>();
const { projectId, workflowId, selectedNode } = toRefs(props);
const extensionConfig = ref<ExtensionConfig | null>(null);
const isConfigReady = ref(false);
let deactivateDataServicesFn: () => void;

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const loadExtensionConfig = async () => {
  const _extensionConfig = await API.node.getNodeDialog({
    projectId: projectId.value,
    workflowId: workflowId.value,
    nodeId: selectedNode.value.id,
  });

  consola.trace("NodeDialog :: extensionConfig", _extensionConfig);

  if (_extensionConfig.deactivationRequired) {
    deactivateDataServicesFn = () => {
      API.node.deactivateNodeDataServices({
        projectId: projectId.value,
        workflowId: workflowId.value,
        nodeId: selectedNode.value.id,
        extensionType: "dialog",
      });
    };
  }

  extensionConfig.value = _extensionConfig;
};

const { uniqueId } = useUniqueNodeConfigStateId(toRefs(props));

const {
  setEventDispatcher,
  setDirtyState,
  setLatestPublishedData,
  setApplyComplete,
  resetDirtyState,
} = useNodeConfigAPI();

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

  callNodeDataService: async (params: any) => {
    const { serviceType, dataServiceRequest } = params;

    const result = await API.node.callNodeDataService({
      projectId: projectId.value,
      workflowId: workflowId.value,
      nodeId: selectedNode.value.id,
      extensionType: "dialog",
      serviceType,
      dataServiceRequest,
    });

    consola.trace("NodeDialog :: callNodeDataService result", result);

    return { result };
  },

  publishData: (data) => {
    consola.trace("NodeDialog :: publishData", data);
    setLatestPublishedData(data);
  },

  registerPushEventService: ({ dispatchPushEvent }) => {
    setEventDispatcher(dispatchPushEvent);

    return () => {};
  },

  onDirtyStateChange: setDirtyState,

  onApplied: (payload) => setApplyComplete(payload.isApplied),

  // NOOP - not required by this embedding context for this type of UI Extension
  updateDataPointSelection: () => Promise.resolve(null),
  imageGenerated: noop,
  setReportingContent: noop,
  sendAlert: noop,
  setControlsVisibility: noop,
};

watch(
  uniqueId,
  async () => {
    try {
      isConfigReady.value = false;
      resetDirtyState();

      emit("loadingStateChange", {
        value: "loading",
        message: "Loading dialog",
      });

      await loadExtensionConfig();

      isConfigReady.value = true;
      emit("loadingStateChange", { value: "ready" });
    } catch (error) {
      isConfigReady.value = false;

      emit("loadingStateChange", {
        value: "error",
        message: error as string,
        error,
      });
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  deactivateDataServicesFn?.();
});
</script>

<template>
  <UIExtension
    v-if="isConfigReady"
    :extension-config="extensionConfig!"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
    :shadow-app-style="{ width: '100%', zIndex: 0, height: '100%' }"
  />
</template>
