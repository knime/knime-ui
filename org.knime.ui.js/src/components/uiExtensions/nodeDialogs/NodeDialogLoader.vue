<script setup lang="ts">
import { API } from "@api";
import { ref, toRefs, computed, watch, onUnmounted, onMounted } from "vue";
import type { KnimeNode } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import type { CommonViewLoaderData } from "../common/types";
import { UIExtension } from "webapps-common/ui/uiExtensions";

type ComponentData = CommonViewLoaderData & {
  configReady: boolean;
};

/**
 * Dynamically loads a component that will render a Node's configuration dialog
 */
interface Props {
  projectId: string;
  workflowId: string;
  selectedNode: KnimeNode;
}

const props = defineProps<Props>();
const store = useStore();
const { projectId, workflowId, selectedNode } = toRefs(props);
const componentData = ref<ComponentData>({
  deactivateDataServicesFn: null,
  apiLayer: null,
  extensionConfig: null,
  configReady: false,
});

const resourceLocationResolver = (path: string, baseUrl?: string) => {
  // TODO: NXT-1295. Originally caused NXT-1217
  // Remove this unnecessary store getter once the issue in the ticket
  // can be solved in a better way. It is necessary at the moment because the TableView is accessing
  // this store module internally, so if not provided then it would error out in the application
  return store.getters["api/uiExtResourceLocation"]({
    resourceInfo: { path, baseUrl },
  });
};

const loadExtensionConfig = async () => {
  try {
    const nodeDialogView = await API.node.getNodeDialog({
      projectId: projectId.value,
      workflowId: workflowId.value,
      nodeId: selectedNode.value.id,
    });

    if (nodeDialogView.deactivationRequired) {
      componentData.value.deactivateDataServicesFn = () => {
        API.node.deactivateNodeDataServices({
          projectId: projectId.value,
          workflowId: workflowId.value,
          nodeId: selectedNode.value.id,
          extensionType: "dialog",
        });
      };
    }

    componentData.value.extensionConfig = nodeDialogView;
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

const resourceLocation = computed(() => {
  if (!componentData.value.extensionConfig) {
    return "";
  }
  const { baseUrl, path } = componentData.value.extensionConfig.resourceInfo;
  return resourceLocationResolver(path ?? "", baseUrl);
});

watch(renderKey, () => loadExtensionConfig(), { immediate: true });

onUnmounted(() => {
  if (componentData.value.deactivateDataServicesFn) {
    componentData.value.deactivateDataServicesFn();
  }
});

onMounted(async () => {
  await loadExtensionConfig();
  const noop = () => {};
  componentData.value.apiLayer = {
    getResourceLocation: (path: string) => {
      return Promise.resolve(
        resourceLocationResolver(
          path,
          componentData.value.extensionConfig?.resourceInfo?.baseUrl,
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
  componentData.value.configReady = true;
});
</script>

<template>
  <UIExtension
    v-if="componentData.configReady"
    :extension-config="componentData.extensionConfig!"
    :resource-location="resourceLocation"
    :api-layer="componentData.apiLayer!"
  />
</template>
