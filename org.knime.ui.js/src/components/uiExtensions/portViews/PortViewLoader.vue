<script setup lang="ts">
import { toRef } from "vue";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer/vue";

import type { KnimeNode } from "@/api/custom-types";
import type { UIExtensionLoadingState } from "../common/types";
import { useSelectionEvents } from "../common/useSelectionEvents";
import { useUIExtensionLifecycle } from "../common/useUIExtensionLifecycle";
import { getMessage } from "../common/utils/uiExtensionAlert";
import DataValueViewWrapper from "../dataValueViews/DataValueViewWrapper.vue";
import { useDataValueView } from "../dataValueViews/useDataValueView";

/**
 * Dynamically loads a component that will render a Port's output view
 */
type Props = {
  projectId: string;
  workflowId: string;
  versionId?: string;
  selectedNode: KnimeNode;
  selectedPortIndex: number;
  selectedViewIndex: number;
  uniquePortKey: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

const loadExtensionConfig = async () => {
  let deactivateDataServicesFn: (() => Promise<any>) | undefined;

  // store the following in none-reactive variables to ensure deactivatePortDataServices is called
  // with the same values as getPortView
  const {
    projectId,
    workflowId,
    versionId,
    selectedNode,
    selectedPortIndex: portIdx,
    selectedViewIndex: viewIdx,
  } = props;

  const portView = await API.port.getPortView({
    projectId,
    workflowId,
    versionId: versionId ?? CURRENT_STATE_VERSION,
    nodeId: selectedNode.id,
    portIdx,
    viewIdx,
  });

  if (portView.deactivationRequired) {
    deactivateDataServicesFn = () =>
      API.port.deactivatePortDataServices({
        projectId,
        workflowId,
        versionId: versionId ?? CURRENT_STATE_VERSION,
        nodeId: selectedNode.id,
        portIdx,
        viewIdx,
      });
  }

  return {
    extensionConfig: portView,
    deactivateDataServices: deactivateDataServicesFn,
  };
};

const {
  open: showDataValueView,
  close: closeDataValueView,
  element: dataValueView,
  config: dataValueViewConfig,
  anchor: dataValueViewAnchor,
  addListener: addDataValueViewPushEventListener,
} = useDataValueView();

const closeDataValueViewWithoutDelay = () =>
  closeDataValueView({ withoutDelay: true });

const {
  extensionConfig,
  isLoadingConfig,
  error,
  resourceLocation,
  getResourceLocation,
} = useUIExtensionLifecycle({
  renderKey: toRef(props, "uniquePortKey"),
  configLoader: loadExtensionConfig,
  onExtensionLoadingStateChange: (state) => emit("loadingStateChange", state),
  onBeforeLoadUIExtension: () => {
    closeDataValueViewWithoutDelay();
  },
});

const noop = () => {}; // NOSONAR

const apiLayer: UIExtensionAPILayer = {
  getResourceLocation,
  showDataValueView,
  closeDataValueView,
  callNodeDataService: async (params) => {
    const { serviceType, dataServiceRequest } = params;

    const result = await API.port.callPortDataService({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: props.versionId ?? CURRENT_STATE_VERSION,
      nodeId: props.selectedNode.id,
      portIdx: props.selectedPortIndex,
      viewIdx: props.selectedViewIndex,
      serviceType: serviceType as "initial_data" | "data",
      dataServiceRequest,
    });

    return { result };
  },

  updateDataPointSelection: async (params) => {
    const { mode, selection } = params;
    const result = await API.port.updateDataPointSelection({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: props.versionId ?? CURRENT_STATE_VERSION,
      nodeId: props.selectedNode.id,
      portIdx: props.selectedPortIndex,
      viewIdx: props.selectedViewIndex,
      mode: mode as "add" | "remove" | "replace",
      selection,
    });
    return { result };
  },

  sendAlert: (alert) => {
    consola.log("Alert received for PortView :>> ", alert);

    if (alert.type === "error") {
      emit("loadingStateChange", {
        value: "error",
        message: getMessage(alert),
      });
    }
  },

  // NOOP - not required by this embedding context for this type of UI Extension
  publishData: noop,
  setReportingContent: noop,
  imageGenerated: noop,
  registerPushEventService: ({ dispatchPushEvent }) => {
    const id = {
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.selectedNode.id,
    };
    addDataValueViewPushEventListener(dispatchPushEvent);
    const { addListener, removeListener } = useSelectionEvents();
    addListener(id, dispatchPushEvent);
    return () => {
      removeListener(id);
    };
  },
  onDirtyStateChange: noop,
  onApplied: noop,
  setControlsVisibility: noop,
};
</script>

<template>
  <UIExtension
    v-if="!error && !isLoadingConfig && extensionConfig"
    :extension-config="extensionConfig"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />

  <DataValueViewWrapper
    v-if="dataValueViewConfig"
    ref="dataValueView"
    :anchor="toRef(dataValueViewAnchor)"
    :project-id="projectId"
    :workflow-id="workflowId"
    :version-id="versionId"
    :node-id="selectedNode.id"
    :selected-port-index="selectedPortIndex"
    :selected-row-index="dataValueViewConfig.rowIndex"
    :selected-col-index="dataValueViewConfig.colIndex"
    @close="closeDataValueViewWithoutDelay"
  />
</template>
