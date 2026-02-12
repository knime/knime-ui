<script setup lang="ts">
/**
 * Dynamically loads a component that will render a data value view
 */
import { computed, ref } from "vue";
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
import { useUIExtensionLifecycle } from "../common/useUIExtensionLifecycle";

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
const retryCount = ref(0);

const loadExtensionConfig = async () => {
  const {
    projectId,
    workflowId,
    versionId,
    nodeId,
    selectedColIndex,
    selectedPortIndex,
    selectedRowIndex,
  } = props;

  const extensionConfig = await API.port.getDataValueView({
    projectId,
    workflowId,
    versionId: versionId ?? CURRENT_STATE_VERSION,
    nodeId,
    portIdx: selectedPortIndex,
    rowIdx: selectedRowIndex,
    colIdx: selectedColIndex,
  });

  // TODO: UIEXT-2229: Add data value view deactivation

  consola.info("DataValueView :: extensionConfig", extensionConfig);

  return { extensionConfig };
};

const {
  extensionConfig,
  isLoadingConfig,
  resourceLocation,
  error,
  getResourceLocation,
} = useUIExtensionLifecycle({
  renderKey: computed(
    () =>
      `${props.selectedColIndex}--${props.selectedRowIndex}--${retryCount.value}`,
  ),
  configLoader: loadExtensionConfig,
});

const isBlockingError = computed(
  () => error.value?.code === USER_ERROR_CODE_BLOCKING,
);

const noop = () => {}; // NOSONAR

const apiLayer: UIExtensionAPILayer = {
  getResourceLocation,

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
</script>

<template>
  <SkeletonItem v-if="isLoadingConfig" type="rounded-md" />
  <UIExtensionBlockingErrorView
    v-else-if="isBlockingError"
    :alert="error"
    @retry="() => retryCount++"
  />
  <UIExtension
    v-else-if="!error && extensionConfig"
    :extension-config="extensionConfig!"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
