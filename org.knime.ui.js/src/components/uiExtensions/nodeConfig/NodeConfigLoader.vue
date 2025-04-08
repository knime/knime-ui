<script setup lang="ts">
import { onUnmounted, ref, toRefs, watch } from "vue";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import { type Alert } from "@knime/ui-extension-renderer/api";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer/vue";

import { gatewayRpcClient } from "@/api/gateway-api";
import type { NativeNode } from "@/api/gateway-api/generated-api";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import type { ExtensionConfig, UIExtensionLoadingState } from "../common/types";
import { useNotifyUIExtensionAlert } from "../common/useNotifyUIExtensionAlert";
import { useResourceLocation } from "../common/useResourceLocation";
import { useUniqueNodeStateId } from "../common/useUniqueNodeStateId";

/**
 * Dynamically loads a component that will render a Node's configuration dialog
 * TODO: NXT-3540, Add a version property here?
 */
interface Props {
  projectId: string;
  workflowId: string;
  selectedNode: NativeNode;
}

const props = defineProps<Props>();

// Even though there's a store usage, this component should be limited to
// using only the nodeConfiguration store, to keep it as context-less as possible
const nodeConfigurationStore = useNodeConfigurationStore();
const { notify } = useNotifyUIExtensionAlert();

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

const areControlsVisible = ref(true);

const loadExtensionConfig = async () => {
  const _extensionConfig = await API.node.getNodeDialog({
    projectId: projectId.value,
    workflowId: workflowId.value,
    versionId: CURRENT_STATE_VERSION, // TODO: NXT-3540
    nodeId: selectedNode.value.id,
  });

  consola.info("NodeDialog :: extensionConfig", _extensionConfig);

  if (_extensionConfig.deactivationRequired) {
    deactivateDataServicesFn = () => {
      API.node.deactivateNodeDataServices({
        projectId: projectId.value,
        workflowId: workflowId.value,
        versionId: CURRENT_STATE_VERSION,
        nodeId: selectedNode.value.id,
        extensionType: "dialog",
      });
    };
  }

  extensionConfig.value = { ..._extensionConfig, startEnlarged: false };

  nodeConfigurationStore.setActiveExtensionConfig(extensionConfig.value);
};

const { uniqueNodeConfigId } = useUniqueNodeStateId(toRefs(props));

const noop = () => {}; // NOSONAR

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
      versionId: CURRENT_STATE_VERSION,
      nodeId: selectedNode.value.id,
      extensionType: "dialog",
      serviceType,
      dataServiceRequest,
    });

    consola.trace("NodeDialog :: callNodeDataService result", result);

    return { result };
  },

  callKnimeUiApi: async (method: string, params: any) => {
    const response = await gatewayRpcClient.call(method, {
      projectId: projectId.value,
      workflowId: workflowId.value,
      nodeId: selectedNode.value.id,
      ...params,
    });
    return { isSome: true, result: response };
  },

  publishData: (data) => {
    consola.trace("NodeDialog :: publishData", data);
    nodeConfigurationStore.setLatestPublishedData({
      data,
      projectId: projectId.value,
      workflowId: workflowId.value,
      nodeId: selectedNode.value.id,
    });
  },

  registerPushEventService: ({ dispatchPushEvent }) => {
    nodeConfigurationStore.setPushEventDispatcher(dispatchPushEvent);

    return () => {};
  },

  onDirtyStateChange: (dirtyState) =>
    nodeConfigurationStore.setDirtyState(dirtyState),

  onApplied: (payload) =>
    nodeConfigurationStore.setApplyComplete(payload.isApplied),

  setControlsVisibility: ({ shouldBeVisible }) => {
    areControlsVisible.value = shouldBeVisible;
  },

  sendAlert: (alert: Alert) => {
    consola.log("Alert received for NodeConfigLoader :>> ", alert);

    notify(alert, {
      isNodeConfig: true,
      nodeId: selectedNode.value.id,
    });
  },

  // NOOP - not required by this embedding context for this type of UI Extension
  updateDataPointSelection: () => Promise.resolve(null),
  imageGenerated: noop,
  setReportingContent: noop,
  showDataValueView: noop,
  closeDataValueView: noop,
};

watch(
  uniqueNodeConfigId,
  async () => {
    try {
      isConfigReady.value = false;
      nodeConfigurationStore.setActiveExtensionConfig(null);
      nodeConfigurationStore.resetDirtyState();

      emit("loadingStateChange", {
        value: "loading",
        message: "Loading dialog",
      });

      await loadExtensionConfig();

      isConfigReady.value = true;
      emit("loadingStateChange", { value: "ready" });
    } catch (error) {
      isConfigReady.value = false;

      consola.error("NodeConfigLoader :: failed to initialize", {
        error,
        uniqueNodeConfigId: uniqueNodeConfigId.value,
      });

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
  nodeConfigurationStore.setActiveExtensionConfig(null);
  deactivateDataServicesFn?.();
});
</script>

<template>
  <slot name="header" />
  <UIExtension
    v-if="isConfigReady"
    :extension-config="extensionConfig!"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
    :shadow-app-style="{ width: '100%', zIndex: 0, height: '100%' }"
  />
  <slot v-if="areControlsVisible" name="controls" />
</template>
