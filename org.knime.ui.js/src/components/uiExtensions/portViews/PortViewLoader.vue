<script setup lang="ts">
import { ref, toRef, watch, onMounted, onUnmounted } from "vue";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "webapps-common/ui/uiExtensions";
import { AlertType, type Alert } from "@knime/ui-extension-service";

import { API } from "@api";
import type { KnimeNode } from "@/api/custom-types";

import type { ExtensionConfig } from "../common/types";
import { useResourceLocation } from "../common/useResourceLocation";

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

const emit = defineEmits(["stateChange"]);

const error = ref(null);
const extensionConfig = ref<ExtensionConfig | null>(null);
const isConfigReady = ref(false);
const isLoading = ref(false);

let deactivateDataServicesFn: () => void;

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const modifyPortViewSettings = (portView: unknown) => {
  // Introduced with NXT-2044 because selection is enabled for the detached
  // table port view (via the table port view settings) but not yet
  // supported by the _embedded_ (this) table port view. Hence, we modify
  // the table port view settings to _not_ show the selection checkboxes.
  // Workaround to be removed with NXT-2042.

  if (
    typeof portView !== "object" ||
    portView === null ||
    (typeof portView === "object" && !("initialData" in portView))
  ) {
    return;
  }

  if (!portView.initialData || typeof portView.initialData !== "string") {
    return;
  }

  const initialData = JSON.parse(portView.initialData);
  const settings = initialData?.result?.settings;
  if (settings?.selectionMode === "EDIT") {
    settings.selectionMode = "OFF";
    portView.initialData = JSON.stringify(initialData);
  }
};

const loadExtensionConfig = async () => {
  const portView = await API.port.getPortView({
    projectId: props.projectId,
    workflowId: props.workflowId,
    nodeId: props.selectedNode.id,
    portIdx: props.selectedPortIndex,
    viewIdx: props.selectedViewIndex,
  });

  modifyPortViewSettings(portView);

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

watch(toRef(props, "uniquePortKey"), async () => {
  error.value = null;
  isLoading.value = true;
  emit("stateChange", {
    state: "loading",
    portKey: props.uniquePortKey,
  });

  await loadExtensionConfig();
  emit("stateChange", {
    state: "ready",
    portKey: props.uniquePortKey,
  });

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

  updateDataPointSelection: () => {
    // TODO: impl with NXT-2383 https://knime-com.atlassian.net/browse/NXT-2383
    return Promise.resolve(null);
  },

  sendAlert: (alert: Alert, closeAlert?: () => void) => {
    consola.warn("Alerts not yet implemented");

    if (alert.type === AlertType.ERROR) {
      emit("stateChange", {
        state: "error",
        message: alert.subtitle,
      });

      // remove button if there is one
      closeAlert?.();
    }
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

onMounted(async () => {
  emit("stateChange", {
    state: "loading",
    portKey: props.uniquePortKey,
  });

  try {
    await loadExtensionConfig();

    isConfigReady.value = true;
    emit("stateChange", { state: "ready", portKey: props.uniquePortKey });
  } catch (error) {
    emit("stateChange", { state: "error", message: error });
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
