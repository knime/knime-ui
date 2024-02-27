<script setup lang="ts">
import { API } from "@api";
import { ref, toRefs, computed, watch, onUnmounted, onMounted } from "vue";
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
let apiLayer = ref<UIExtensionAPILayer | null>(null);
let deactivateDataServicesFn: () => void;

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const loadExtensionConfig = async () => {
  try {
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
  } catch (error) {
    throw error;
  }
};

const renderKey = computed(() => {
  if (selectedNode.value.hasDialog) {
    return [projectId, workflowId, selectedNode.value.id].join("/");
  }
  return "";
});

watch(renderKey, () => loadExtensionConfig(), { immediate: true });

onUnmounted(() => {
  if (deactivateDataServicesFn) {
    deactivateDataServicesFn();
  }
});

onMounted(async () => {
  await loadExtensionConfig();
  const noop = () => {};
  apiLayer.value = {
    getResourceLocation: (path: string) => {
      return Promise.resolve(
        resourceLocationResolver(
          path,
          extensionConfig?.value.resourceInfo?.baseUrl,
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
    setSettingsWithCleanModelSettings: noop,
    setDirtyModelSettings: noop,
    onApplied: noop,
  };
  isConfigReady.value = true;
});
</script>

<template>
  <UIExtension
    v-if="isConfigReady"
    :extension-config="extensionConfig!"
    :resource-location="resourceLocation"
    :shadow-app-style="{ overflow: 'auto' }"
    :api-layer="apiLayer!"
  />
</template>
