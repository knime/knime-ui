<script setup lang="ts">
import { onUnmounted, ref, toRef, watch } from "vue";

import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer";
import { AlertType } from "@knime/ui-extension-service";

import { API } from "@/api";
import type { KnimeNode } from "@/api/custom-types";
import type { ExtensionConfig, UIExtensionLoadingState } from "../common/types";
import { useResourceLocation } from "../common/useResourceLocation";
import { useSelectionEvents } from "../common/useSelectionEvents";
import DataValueViewWrapper from "../dataValueViews/DataValueViewWrapper.vue";
import { useDataValueView } from "../dataValueViews/useDataValueView";

/**
 * Dynamically loads a component that will render a Port's output view
 */

type Props = {
  projectId: string;
  workflowId: string;
  selectedNode: KnimeNode;
  selectedPortIndex: number;
  selectedViewIndex: number;
  uniquePortKey: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

const error = ref<any>(null);
const extensionConfig = ref<ExtensionConfig | null>(null);
const isLoadingConfig = ref(false);

let deactivateDataServicesFn: () => void;

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const loadExtensionConfig = async () => {
  const portView = await API.port.getPortView({
    projectId: props.projectId,
    workflowId: props.workflowId,
    nodeId: props.selectedNode.id,
    portIdx: props.selectedPortIndex,
    viewIdx: props.selectedViewIndex,
  });

  if (portView.deactivationRequired) {
    deactivateDataServicesFn = () => {
      API.port.deactivatePortDataServices({
        projectId: props.projectId,
        workflowId: props.workflowId,
        nodeId: props.selectedNode.id,
        portIdx: props.selectedPortIndex,
        viewIdx: props.selectedViewIndex,
      });
    };
  }

  extensionConfig.value = portView;
};

const noop = () => {}; // NOSONAR

const {
  open: showDataValueView,
  close: closeDataValueView,
  element: dataValueView,
  config: dataValueViewConfig,
  styles: dataValueViewStyles,
  isDragging,
} = useDataValueView();

const closeDataValueViewWithoutDelay = () =>
  closeDataValueView({ withoutDelay: true });
const apiLayer: UIExtensionAPILayer = {
  getResourceLocation: (path: string) => {
    return Promise.resolve(
      resourceLocationResolver(
        path,
        extensionConfig.value?.resourceInfo?.baseUrl,
      ),
    );
  },
  showDataValueView,
  closeDataValueView,
  callNodeDataService: async (params) => {
    const { serviceType, dataServiceRequest } = params;
    const result = await API.port.callPortDataService({
      projectId: props.projectId,
      workflowId: props.workflowId,
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

    if (alert.type === AlertType.ERROR) {
      emit("loadingStateChange", {
        value: "error",
        message: alert.subtitle ?? "",
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

watch(
  toRef(props, "uniquePortKey"),
  async () => {
    closeDataValueViewWithoutDelay();
    try {
      error.value = null;
      isLoadingConfig.value = true;

      emit("loadingStateChange", {
        value: "loading",
        message: "Loading port view data",
      });

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
  { immediate: true },
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

  <DataValueViewWrapper
    v-if="dataValueViewConfig"
    ref="dataValueView"
    :style="dataValueViewStyles"
    :project-id="projectId"
    :workflow-id="workflowId"
    :node-id="selectedNode.id"
    :selected-port-index="selectedPortIndex"
    :selected-row-index="dataValueViewConfig.rowIndex"
    :selected-col-index="dataValueViewConfig.colIndex"
    :is-dragging="isDragging"
    @close="closeDataValueViewWithoutDelay"
  />
</template>
