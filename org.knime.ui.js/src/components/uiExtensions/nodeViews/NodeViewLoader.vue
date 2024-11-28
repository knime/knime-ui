<script setup lang="ts">
import { computed, onUnmounted, ref, toRaw, toRefs, watch } from "vue";

import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer";
import {
  type Alert,
  UIExtensionPushEvents,
  ViewState,
} from "@knime/ui-extension-service";

import { API } from "@/api";
import type { NativeNode } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import ExecuteButton from "../ExecuteButton.vue";
import type { ExtensionConfig, UIExtensionLoadingState } from "../common/types";
import { useResourceLocation } from "../common/useResourceLocation";
import { useSelectionEvents } from "../common/useSelectionEvents";
import { useUniqueNodeStateId } from "../common/useUniqueNodeStateId";

/**
 * Renders a node view
 */

type Props = {
  projectId: string;
  workflowId: string;
  selectedNode: NativeNode;
};

const props = defineProps<Props>();

// Even though there's a store usage, this component should be limited to
// using only the nodeConfiguration store, to keep it as context-less as possible
const store = useStore();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
  alert: [{ alert: Alert; nodeName?: string } | null];
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
        eventType: UIExtensionPushEvents.EventTypes.DataEvent,
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

const { uniqueNodeViewId } = useUniqueNodeStateId(toRefs(props));

const latestPublishedData = computed(
  () => store.state.nodeConfiguration.latestPublishedData,
);
const latestPublishedDataForThisNode = computed(() => {
  if (latestPublishedData.value === null) {
    return null;
  }
  const { projectId, workflowId, nodeId, data } = latestPublishedData.value;
  if (
    projectId !== props.projectId ||
    workflowId !== props.workflowId ||
    nodeId !== props.selectedNode.id
  ) {
    return null;
  }
  return data;
});

const dirtyState = computed(() => store.state.nodeConfiguration.dirtyState);

const applySettings = (nodeId: string, execute?: boolean) => {
  store.dispatch("nodeConfiguration/applySettings", { nodeId, execute });
};

watch(
  latestPublishedDataForThisNode,
  (data) => {
    updateViewData?.(data);
  },
  { deep: true },
);

const hasToReexecute = computed(() => {
  // when receiving dirty state we check whether
  // the view can be displayed based on said dirty state
  return dirtyState.value.view === ViewState.CONFIG;
});

watch(
  uniqueNodeViewId,
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
  <ExecuteButton
    v-if="!error && !isLoadingConfig && hasToReexecute"
    message="To preview the node, please apply your changes and re-execute the node"
    button-label="Apply & execute"
    @execute-node="applySettings(selectedNode.id, true)"
  />

  <UIExtension
    v-if="!error && !isLoadingConfig && !hasToReexecute"
    :extension-config="extensionConfig!"
    :initial-shared-data="latestPublishedDataForThisNode"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
