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

const hasNoDialog = computed(
  () => selectedNode.value && !selectedNode.value.dialogType,
);

const isLegacyDialog = computed(
  () => hasLegacyDialog.value && !isMetanode.value,
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
    <template v-if="hasNoDialog">
      <div class="placeholder-text">This node has no dialog.</div>
    </template>

    <!-- Show placeholder text and "Download AP" button -->
    <template v-else-if="shouldDisplayDownload">
      <span class="placeholder-text">
        To configure nodes with a classic dialog, download the KNIME Analytics
        Platform.
      </span>

      <DownloadAPButton compact src="node-configuration-panel" />
    </template>

    <!-- Show placeholder text and "Open dialog" button -->
    <template v-else-if="isLegacyDialog">
      <span class="placeholder-text">
        This node dialog is not supported here.
      </span>

      <Button
        v-if="isDesktop()"
        with-border
        compact
        class="button"
        @click="openNodeConfiguration"
      >
        <CogIcon />
        <span>Open dialog</span>
      </Button>
    </template>

    <!-- Show nothing but a placeholder text if no buttons are needed -->
    <template v-else>
      <span v-if="isMetanode" class="placeholder-text">
        Configuration is not available for metanodes.<br />
        Select a node to show its dialog.
      </span>
      <span v-else class="placeholder-text">
        Select a node to show its dialog.
      </span>
    </template>
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
