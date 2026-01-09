<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { Button } from "@knime/components";
import CogIcon from "@knime/styles/img/icons/cog.svg";

import { Node } from "@/api/gateway-api/generated-api";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import { isDesktop } from "@/environment";
import { workflowDomain } from "@/lib/workflow-domain";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";

const { shouldDisplayDownloadAPButton } = storeToRefs(useUIControlsStore());
const { activeContext } = storeToRefs(useNodeConfigurationStore());

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

const shouldDisplayDownload = computed(
  () =>
    hasLegacyDialog.value &&
    shouldDisplayDownloadAPButton.value &&
    !isMetanode.value,
);

const openNodeConfiguration = () => {
  if (!selectedNode.value) {
    return;
  }

  const nodeId = selectedNode.value.id;
  useDesktopInteractionsStore().openNodeConfiguration(nodeId);
};
</script>

<template>
  <div class="placeholder full-height">
    <template v-if="isMetanode">
      <div class="placeholder-text">
        Configuration is not available for metanodes.
      </div>
    </template>

    <template v-if="hasNoDialog">
      <div class="placeholder-text">This node has no dialog.</div>
    </template>

    <template v-if="hasLegacyDialog">
      <!-- Show placeholder text and "Download AP" button -->
      <template v-if="shouldDisplayDownload">
        <span class="placeholder-text">
          To configure nodes with a classic dialog, download the KNIME Analytics
          Platform.
        </span>

        <DownloadAPButton compact src="node-configuration-panel" />
      </template>

      <!-- Show placeholder text and "Open dialog" button -->
      <template v-else>
        <span class="placeholder-text">
          This node dialog is not supported here.
        </span>

        <Button
          v-if="isDesktop()"
          with-border
          compact
          class="button"
          data-test-id="open-legacy-config-btn"
          @click="openNodeConfiguration"
        >
          <CogIcon />
          <span>Open dialog</span>
        </Button>
      </template>
    </template>

    <!-- Show a placeholder text if nothing is selected -->
    <span v-if="!selectedNode" class="placeholder-text">
      Select a node to show its dialog.
    </span>
  </div>
</template>

<style lang="postcss" scoped>
.full-height {
  height: 100%;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  & .placeholder-text {
    padding: 15px;
    text-align: center;
  }

  & .button {
    margin: 0 15px;
  }
}
</style>
