<script setup lang="ts">
/**
 * Dynamically loads a component that will render a data value view
 */
import { computed, ref, toRef, watch } from "vue";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import {
  type Alert,
  USER_ERROR_CODE_BLOCKING,
} from "@knime/ui-extension-renderer/api";
import {
  UIExtension,
  type UIExtensionAPILayer,
  UIExtensionBlockingErrorView,
} from "@knime/ui-extension-renderer/vue";

import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import type { ExtensionConfig } from "../common/types";
import { useResourceLocation } from "../common/useResourceLocation";

export interface Props {
  projectId: string;
  workflowId: string;
  versionId?: string;
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

const isBlockingError = computed(
  () => error.value?.code === USER_ERROR_CODE_BLOCKING,
);

const loadExtensionConfig = async () => {
  error.value = null;
  isLoadingConfig.value = true;
  try {
    extensionConfig.value = await API.port.getDataValueView({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: props.versionId ?? CURRENT_STATE_VERSION,
      nodeId: props.nodeId,
      portIdx: props.selectedPortIndex,
      rowIdx: props.selectedRowIndex,
      colIdx: props.selectedColIndex,
    });
  } catch (_error) {
    error.value = _error;
  }
  isLoadingConfig.value = false;
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
  sendAlert: (alert: Alert) => {
    error.value = alert;
  },
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

watch(
  [toRef(props, "selectedColIndex"), toRef(props, "selectedRowIndex")],
  async () => {
    await loadExtensionConfig();
  },
  { immediate: true },
);
// TODO: UIEXT-2229: Add data value view deactivation
</script>

<template>
  <SkeletonItem v-if="isLoadingConfig" type="rounded-md" />
  <UIExtensionBlockingErrorView
    v-else-if="isBlockingError"
    :alert="error"
    @retry="loadExtensionConfig()"
  />
  <UIExtension
    v-else-if="!error"
    :extension-config="extensionConfig!"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
