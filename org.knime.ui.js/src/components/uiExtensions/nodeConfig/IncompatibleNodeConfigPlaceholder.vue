<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { KdsEmptyState } from "@knime/kds-components";

import { Node } from "@/api/gateway-api/generated-api";
import { useAnalyticsPlatformDownloadUrl } from "@/composables/useAnalyticsPlatformDownloadUrl";
import { isDesktop } from "@/environment";
import { APP_ROUTES } from "@/router/appRoutes";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { isNodeMetaNode } from "@/util/nodeUtil";

const { shouldDisplayDownloadAPButton } = storeToRefs(useUIControlsStore());
const { activeContext } = storeToRefs(useNodeConfigurationStore());

const router = useRouter();

const selectedNode = computed(() => activeContext.value?.node ?? null);

const isMetanode = computed(
  () => selectedNode.value && isNodeMetaNode(selectedNode.value),
);

const hasNoDialog = computed(
  () =>
    selectedNode.value && !selectedNode.value.dialogType && !isMetanode.value,
);

const hasLegacyDialog = computed(() =>
  Boolean(
    selectedNode.value &&
      selectedNode.value.dialogType === Node.DialogTypeEnum.Swing,
  ),
);

const shouldDisplayDownload = computed(
  () =>
    hasLegacyDialog.value &&
    shouldDisplayDownloadAPButton.value &&
    !isMetanode.value,
);

const { href: downloadHref } = useAnalyticsPlatformDownloadUrl(
  "node-configuration-panel",
);

const openNodeConfiguration = () => {
  if (!selectedNode.value) {
    return;
  }

  const nodeId = selectedNode.value.id;
  useDesktopInteractionsStore().openNodeConfiguration(nodeId);
};

const openMetanode = () => {
  if (!selectedNode.value || !isMetanode.value) {
    return;
  }

  const { projectId } = useWorkflowStore().getProjectAndWorkflowIds;

  router.push({
    name: APP_ROUTES.WorkflowPage,
    params: { projectId, workflowId: selectedNode.value.id },
  });
};
</script>

<template>
  <div class="placeholder full-height">
    <KdsEmptyState
      v-if="isMetanode"
      headline="No settings"
      description="Metanodes require no configuration."
      button-label="Open Metanode"
      button-variant="outlined"
      button-size="small"
      @button-click="openMetanode"
    />

    <KdsEmptyState
      v-if="hasNoDialog"
      headline="No settings"
      description="This node requires no configuration."
    />

    <template v-if="hasLegacyDialog">
      <KdsEmptyState
        v-if="shouldDisplayDownload"
        headline="Classic dialog required"
        description="To configure nodes with a classic dialog, download the KNIME Analytics Platform."
        button-label="Get KNIME Analytics Platform"
        button-variant="filled"
        button-size="small"
        button-trailing-icon="external-link"
        :button-to="downloadHref"
        button-target="_blank"
      />

      <KdsEmptyState
        v-if="isDesktop()"
        headline="This node uses the classic configuration dialog"
        description="This node hasn’t been migrated to the new interface yet. You can configure it using the dialog for now."
        button-label="Open dialog"
        button-variant="outlined"
        button-size="small"
        data-test-id="open-legacy-config-btn"
        @button-click="openNodeConfiguration"
      />
      <KdsEmptyState
        v-else
        headline="This node uses the classic configuration dialog"
        description="This node hasn’t been migrated to the new interface yet. You can configure it using the dialog for now."
      />
    </template>

    <KdsEmptyState v-if="!selectedNode" headline="Select a node to configure" />
  </div>
</template>

<style lang="postcss" scoped>
.full-height {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
