<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, toRaw, toRefs, watch } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import type { Alert, KnownEventType } from "@knime/ui-extension-renderer/api";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer/vue";

import { gatewayRpcClient } from "@/api/gateway-api";
import type { NativeNode } from "@/api/gateway-api/generated-api";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import ExecuteButton from "../ExecuteButton.vue";
import type { UIExtensionLoadingState } from "../common/types";
import { useResourceLocation } from "../common/useResourceLocation";
import { useSelectionEvents } from "../common/useSelectionEvents";
import { useUIExtensionLifecycle } from "../common/useUIExtensionLifecycle";
import { useUniqueNodeStateId } from "../common/useUniqueNodeStateId";

/**
 * Renders a node view
 */

type Props = {
  projectId: string;
  workflowId: string;
  versionId?: string;
  selectedNode: NativeNode;
  timestamp: number;
};

const props = defineProps<Props>();

// Even though there's a store usage, this component should be limited to
// using only the nodeConfiguration store, to keep it as context-less as possible
const nodeConfigurationStore = useNodeConfigurationStore();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
  alert: [{ alert: Alert; nodeName?: string } | null];
}>();

const loadExtensionConfig = async () => {
  let deactivateDataServicesFn: (() => Promise<any>) | undefined;

  // store the following in none-reactive variables to ensure deactivateNodeDataServices is called
  // with the same values as getNodeView
  const { projectId, workflowId, versionId, selectedNode } = props;

  const nodeView = await API.node.getNodeView({
    projectId,
    workflowId,
    versionId: versionId ?? CURRENT_STATE_VERSION,
    nodeId: selectedNode.id,
  });

  if (nodeView?.deactivationRequired) {
    deactivateDataServicesFn = () =>
      API.node.deactivateNodeDataServices({
        projectId,
        workflowId,
        versionId: versionId ?? CURRENT_STATE_VERSION,
        nodeId: selectedNode.id,
        extensionType: "view",
      });
  }

  return {
    extensionConfig: nodeView,
    deactivateDataServices: deactivateDataServicesFn,
  };
};
const { uniqueNodeViewId } = useUniqueNodeStateId(toRefs(props));

const { latestPublishedData, dirtyState, activeNodeViewNeedsExecution } =
  storeToRefs(nodeConfigurationStore);

const { extensionConfig, isLoadingConfig, error } = useUIExtensionLifecycle({
  renderKey: uniqueNodeViewId,
  configLoader: loadExtensionConfig,
  onExtensionLoadingStateChange: (state) => emit("loadingStateChange", state),
  onBeforeLoadUIExtension: () => {
    // reset pending execution state on a new load
    activeNodeViewNeedsExecution.value = false;

    // clear any existing alert emitted from a previous render or view
    emit("alert", null);
  },
});

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const noop = () => {};

let updateViewData: (data: any) => void;

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
      versionId: props.versionId ?? CURRENT_STATE_VERSION,
      nodeId: props.selectedNode.id,
      extensionType: "view",
      serviceType,
      dataServiceRequest,
    });
    return { result };
  },

  callKnimeUiApi: async (method: string, params: any) => {
    const response = await gatewayRpcClient.call(method, params);
    return { isSome: true, result: response };
  },

  updateDataPointSelection: async (params) => {
    const { mode, selection } = params;
    const result = await API.node.updateDataPointSelection({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: props.versionId ?? CURRENT_STATE_VERSION,
      nodeId: props.selectedNode.id,
      mode: mode as "add" | "remove" | "replace",
      selection,
    });
    return { result };
  },

  sendAlert: (alert) => {
    consola.debug("Alert received for NodeView :>> ", alert);
    emit("alert", {
      alert,
      nodeName: extensionConfig.value?.nodeInfo?.nodeName,
    });
  },

  registerPushEventService: ({ dispatchPushEvent }) => {
    // use the provided event dispatcher to initialize the
    // function that updates the data of this UIExtension (NodeView in this case)
    updateViewData = (data) =>
      dispatchPushEvent({
        eventType: "DataEvent" satisfies KnownEventType,
        payload: toRaw(data),
      });

    const id = {
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.selectedNode.id,
    };
    const { addListener, removeListener } = useSelectionEvents();
    addListener(id, dispatchPushEvent);
    return () => {
      removeListener(id);
    };
  },

  // NOOP - not required by this embedding context for this type of UI Extension
  publishData: noop,
  setReportingContent: noop,
  imageGenerated: noop,
  onDirtyStateChange: noop,
  onApplied: noop,
  setControlsVisibility: noop,
  showDataValueView: noop,
  closeDataValueView: noop,
};

const latestPublishedDataForThisNode = computed(() => {
  if (latestPublishedData.value === null) {
    return undefined;
  }

  const { projectId, workflowId, nodeId, versionId, data } =
    latestPublishedData.value;

  if (
    projectId !== props.projectId ||
    workflowId !== props.workflowId ||
    nodeId !== props.selectedNode.id ||
    versionId !== props.versionId
  ) {
    return undefined;
  }
  return data as {
    result?: string | object;
    userError?: object;
    internalError?: object;
  };
});

const applySettings = (nodeId: string, execute?: boolean) => {
  nodeConfigurationStore.applySettings({ nodeId, execute });
};

watch(
  latestPublishedDataForThisNode,
  (data) => {
    updateViewData?.(data);
  },
  { deep: true },
);

const isNodeConfigurationDirty = computed(() => {
  // when receiving dirty state we check whether
  // the view can be displayed based on said dirty state
  return (
    dirtyState.value.view === "configured" || activeNodeViewNeedsExecution.value
  );
});
</script>

<template>
  <ExecuteButton
    v-if="!error && !isLoadingConfig && isNodeConfigurationDirty"
    message="To preview the node, apply your changes and re-execute it."
    button-label="Apply & execute"
    @click="applySettings(selectedNode.id, true)"
  />

  <UIExtension
    v-if="
      !error && !isLoadingConfig && extensionConfig && !isNodeConfigurationDirty
    "
    :extension-config="extensionConfig"
    :initial-shared-data="latestPublishedDataForThisNode"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
