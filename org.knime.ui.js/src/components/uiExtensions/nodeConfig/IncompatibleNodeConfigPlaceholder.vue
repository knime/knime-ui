<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { Button } from "@knime/components";
import CogIcon from "@knime/styles/img/icons/cog.svg";

import { Node } from "@/api/gateway-api/generated-api";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import { isDesktop } from "@/environment";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { isNodeMetaNode } from "@/util/nodeUtil";

const { shouldDisplayDownloadAPButton } = storeToRefs(useUIControlsStore());
const { singleSelectedNode: selectedNode } = storeToRefs(useSelectionStore());

const hasLegacyDialog = computed(() =>
  Boolean(
    selectedNode.value &&
      selectedNode.value.dialogType === Node.DialogTypeEnum.Swing,
  ),
);

const isMetanode = computed(
  () => selectedNode.value && isNodeMetaNode(selectedNode.value),
);

const openNodeConfiguration = () => {
  if (!selectedNode.value) {
    return;
  }

  const nodeId = selectedNode.value.id;
  useDesktopInteractionsStore().openNodeConfiguration(nodeId);
};

const placeholderText = computed(() => {
  if (isMetanode.value) {
    return "Configuration is not available for metanodes. Select a node to show its dialog.";
  }

  if (shouldDisplayDownloadAPButton.value) {
    return "To configure nodes with a classic dialog, download the KNIME Analytics Platform.";
  }

  if (selectedNode.value) {
    return "This node dialog is not supported here.";
  }

  return "Select a node to show its dialog.";
});
</script>

<template>
  <div class="placeholder full-height">
    <!-- Always show a placeholder text -->
    <span class="placeholder-text">{{ placeholderText }}</span>

    <div v-if="hasLegacyDialog">
      <!-- Show a button to open the legacy dialog if it is available -->
      <template v-if="isDesktop">
        <Button
          with-border
          compact
          class="button"
          @click="openNodeConfiguration"
        >
          <CogIcon />
          <span>Open dialog</span>
        </Button>
      </template>

      <!-- Show a download button if in browser -->
      <template v-else-if="shouldDisplayDownloadAPButton">
        <DownloadAPButton compact src="node-configuration-panel" />
      </template>
    </div>
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
