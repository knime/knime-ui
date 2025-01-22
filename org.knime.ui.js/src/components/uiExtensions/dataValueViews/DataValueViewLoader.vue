<script setup lang="ts">
/**
 * Dynamically loads a component that will render a data value view
 */
import { ref, toRef, watch } from "vue";

import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer/vue";

import { API } from "@/api";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import type { ExtensionConfig } from "../common/types";
import { useResourceLocation } from "../common/useResourceLocation";

export interface Props {
  projectId: string;
  workflowId: string;
  nodeId: string;
  selectedPortIndex: number;
  selectedRowIndex: number;
  selectedColIndex: number;
}

const props = defineProps<Props>();

const error = ref<any>(null);
const extensionConfig = ref<ExtensionConfig | null>(null);
const isLoadingConfig = ref(false);

const { resourceLocation, resourceLocationResolver } = useResourceLocation({
  extensionConfig,
});

const loadExtensionConfig = async () => {
  const dataValueView = await API.port.getDataValueView({
    projectId: props.projectId,
    workflowId: props.workflowId,
    nodeId: props.nodeId,
    portIdx: props.selectedPortIndex,
    rowIdx: props.selectedRowIndex,
    colIdx: props.selectedColIndex,
  });

  extensionConfig.value = dataValueView;
};

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

  // TODO: UIEXT-2229: Add data value view rpc data service calls
  // eslint-disable-next-line prefer-promise-reject-errors
  callNodeDataService: () => Promise.reject("Not implemented"),
  // TODO: UIEXT-2204: Add alert handling
  sendAlert: noop,
  updateDataPointSelection: () => Promise.resolve(null),
  publishData: noop,
  setReportingContent: noop,
  imageGenerated: noop,
  registerPushEventService: () => noop,
  onDirtyStateChange: noop,
  onApplied: noop,
  setControlsVisibility: noop,
  closeDataValueView: noop,
  showDataValueView: noop,
};

// TODO: UIEXT-2204 add loading and error state handling
watch(
  [toRef(props, "selectedColIndex"), toRef(props, "selectedRowIndex")],
  async () => {
    try {
      error.value = null;
      isLoadingConfig.value = true;
      await loadExtensionConfig();
    } catch (_error) {
      error.value = _error;
    }
    isLoadingConfig.value = false;
  },
  { immediate: true },
);
// TODO: UIEXT-2229: Add data value view deactivation
</script>

<template>
  <UIExtension
    v-if="!error && !isLoadingConfig"
    :extension-config="extensionConfig!"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
  <SkeletonItem v-else-if="isLoadingConfig" type="rounded-md" />
</template>
