<script setup lang="ts">
import { API } from "@api";
import { ref, toRefs, computed, watch, onUnmounted } from "vue";
import type { KnimeNode } from "@/api/custom-types";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "webapps-common/ui/uiExtensions";
import type { ExtensionConfig } from "../common/types";
import { useResourceLocation } from "../common/useResourceLocation";

/**
 * Dynamically loads a component that will render a Node's configuration dialog
 */
interface Props {
  projectId: string;
  workflowId: string;
  selectedNode: KnimeNode;
}

const props = defineProps<Props>();
const { projectId, workflowId, selectedNode } = toRefs(props);
const extensionConfig = ref<ExtensionConfig | null>(null);
const isConfigReady = ref(false);
let deactivateDataServicesFn: () => void;

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const loadExtensionConfig = async () => {
  const nodeDialogView = await API.node.getNodeDialog({
    projectId: projectId.value,
    workflowId: workflowId.value,
    nodeId: selectedNode.value.id,
  });

  if (nodeDialogView.deactivationRequired) {
    deactivateDataServicesFn = () => {
      API.node.deactivateNodeDataServices({
        projectId: projectId.value,
        workflowId: workflowId.value,
        nodeId: selectedNode.value.id,
        extensionType: "dialog",
      });
    };
  }

  extensionConfig.value = nodeDialogView;
};

const renderKey = computed(() => {
  if (selectedNode.value.hasDialog) {
    return [projectId, workflowId, selectedNode.value.id].join("/");
  }
  return "";
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
    return { result };
  },
  updateDataPointSelection: () => {
    return Promise.resolve(null);
  },
  publishData: noop,
  setReportingContent: noop,
  imageGenerated: noop,
  registerPushEventService: () => {
    return noop;
  },
  sendAlert: noop,
  onDirtyStateChange: noop,
  onApplied: noop,
};

watch(
  renderKey,
  async () => {
    isConfigReady.value = false;
    await loadExtensionConfig();
    isConfigReady.value = true;
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
    :shadow-app-style="{ width: '100%', zIndex: 0 }"
  />
</template>
