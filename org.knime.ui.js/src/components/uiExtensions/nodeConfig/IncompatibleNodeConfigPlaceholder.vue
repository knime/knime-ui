<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { KdsEmptyState } from "@knime/kds-components";

import { Node } from "@/api/gateway-api/generated-api";
import { useAnalyticsPlatformDownloadUrl } from "@/composables/useAnalyticsPlatformDownloadUrl";
import { isDesktop } from "@/environment";
import { workflowDomain } from "@/lib/workflow-domain";
import { APP_ROUTES } from "@/router/appRoutes";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

const { shouldDisplayDownloadAPButton } = storeToRefs(useUIControlsStore());
const { activeContext } = storeToRefs(useNodeConfigurationStore());

const router = useRouter();

const selectedNode = computed(() => activeContext.value?.node ?? null);

const isMetanode = computed(
  () =>
    selectedNode.value && workflowDomain.node.isMetaNode(selectedNode.value),
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

const { href: downloadHref } = useAnalyticsPlatformDownloadUrl(
  "node-configuration-panel",
);

const shouldDisplayDownload = computed(
  () =>
    hasLegacyDialog.value &&
    shouldDisplayDownloadAPButton.value &&
    Boolean(downloadHref.value) &&
    !isMetanode.value,
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
  <div class="full-height">
    <KdsEmptyState
      v-if="isMetanode"
      headline="No settings"
      description="This metanode groups multiple nodes and has no configuration."
      :button="{ label: 'Open metanode', variant: 'outlined', size: 'small' }"
      @button-click="openMetanode"
    />

    <KdsEmptyState
      v-else-if="hasNoDialog"
      headline="No settings"
      description="This node requires no configuration."
    />

    <template v-else-if="hasLegacyDialog">
      <KdsEmptyState
        v-if="shouldDisplayDownload"
        headline="This node uses the classic configuration dialog"
        description="This node has not been migrated to the new interface. To configure nodes with a classic dialog, download the KNIME Analytics Platform."
        :button="{
          label: 'Get KNIME Analytics Platform',
          variant: 'filled',
          size: 'small',
          trailingIcon: 'external-link',
          to: downloadHref,
          target: '_blank',
        }"
      />

      <KdsEmptyState
        v-else-if="isDesktop()"
        headline="This node uses the classic configuration dialog"
        description="This node has not been migrated to the new interface. You can configure it using the classic dialog."
        :button="{ label: 'Open dialog', variant: 'outlined', size: 'small' }"
        data-test-id="open-legacy-config-btn"
        @button-click="openNodeConfiguration"
      />
      <KdsEmptyState
        v-else
        headline="This node uses the classic configuration dialog"
        description="This node has not been migrated to the new interface. You can configure it using the classic dialog."
      />
    </template>

    <KdsEmptyState
      v-else-if="!selectedNode"
      headline="Select a node to configure"
    />
  </div>
</template>

<style lang="postcss" scoped>
.full-height {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
