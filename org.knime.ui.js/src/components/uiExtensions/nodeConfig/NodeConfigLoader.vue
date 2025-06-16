<script setup lang="ts">
import { ref, toRefs } from "vue";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import { type Alert } from "@knime/ui-extension-renderer/api";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer/vue";

import { gatewayRpcClient } from "@/api/gateway-api";
import type {
  ComponentNode,
  NativeNode,
} from "@/api/gateway-api/generated-api";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import type { UIExtensionLoadingState } from "../common/types";
import { useNotifyUIExtensionAlert } from "../common/useNotifyUIExtensionAlert";
import { useResourceLocation } from "../common/useResourceLocation";
import { useUIExtensionLifecycle } from "../common/useUIExtensionLifecycle";
import { useUniqueNodeStateId } from "../common/useUniqueNodeStateId";

/**
 * Dynamically loads a component that will render a Node's configuration dialog
 */
interface Props {
  projectId: string;
  workflowId: string;
  versionId?: string;
  selectedNode: NativeNode | ComponentNode;
}

const props = defineProps<Props>();

// Even though there's a store usage, this component should be limited to
// using only the nodeConfiguration store, to keep it as context-less as possible
const nodeConfigurationStore = useNodeConfigurationStore();
const { notify } = useNotifyUIExtensionAlert();

const { projectId, workflowId, versionId, selectedNode } = toRefs(props);

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

const areControlsVisible = ref(true);

const loadExtensionConfig = async () => {
  let deactivateDataServices: (() => Promise<any>) | undefined;

  // store the following in none-reactive variables to ensure deactivateNodeDataServices is called
  // with the same values as getNodeDialog
  const { projectId, workflowId, versionId, selectedNode } = props;
  const extensionConfig = await API.node.getNodeDialog({
    projectId,
    workflowId,
    versionId: versionId ?? CURRENT_STATE_VERSION,
    nodeId: selectedNode.id,
  });

  consola.info("NodeDialog :: extensionConfig", extensionConfig);

  if (extensionConfig.deactivationRequired) {
    deactivateDataServices = async () => {
      try {
        await API.node.deactivateNodeDataServices({
          projectId,
          workflowId,
          versionId: versionId ?? CURRENT_STATE_VERSION,
          nodeId: selectedNode.id,
          extensionType: "dialog",
        });
      } catch (error) {
        consola.log("NodeConfigLoader :: deactivateNodeDataServices failed", {
          error,
          nodeId: selectedNode.id,
        });
        throw error;
      }
    };
  }

  extensionConfig.startEnlarged = false;
  nodeConfigurationStore.setActiveExtensionConfig(extensionConfig);

  return { extensionConfig, deactivateDataServices };
};

const { uniqueNodeConfigId } = useUniqueNodeStateId(toRefs(props));

const { extensionConfig, isLoadingConfig } = useUIExtensionLifecycle({
  renderKey: uniqueNodeConfigId,
  configLoader: loadExtensionConfig,
  onExtensionLoadingStateChange: (state) => emit("loadingStateChange", state),
});

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

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
      versionId: versionId.value ?? CURRENT_STATE_VERSION,
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
      versionId: versionId.value ?? CURRENT_STATE_VERSION,
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
      versionId: versionId.value,
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
</script>

<template>
  <slot name="header" />
  <UIExtension
    v-if="!isLoadingConfig && extensionConfig"
    :extension-config="extensionConfig"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
    :shadow-app-style="{ width: '100%', zIndex: 0, height: '100%' }"
  />
  <slot v-if="areControlsVisible" name="controls" />
</template>
