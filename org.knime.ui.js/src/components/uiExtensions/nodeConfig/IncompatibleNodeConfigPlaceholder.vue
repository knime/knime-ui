<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@knime/components";
import CogIcon from "@knime/styles/img/icons/cog.svg";

import type { KnimeNode } from "@/api/custom-types";
import { Node } from "@/api/gateway-api/generated-api";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import { useStore } from "@/composables/useStore";
import { isDesktop } from "@/environment";
import { isNodeMetaNode } from "@/util/nodeUtil";

const store = useStore();

const selectedNode = computed<KnimeNode>(
  () => store.getters["selection/singleSelectedNode"],
);

const hasLegacyDialog = computed(() =>
  Boolean(
    selectedNode.value &&
      selectedNode.value.dialogType === Node.DialogTypeEnum.Swing,
  ),
);

const uiControls = computed(() => store.state.uiControls);

const isMetanode = computed(
  () => selectedNode.value && isNodeMetaNode(selectedNode.value),
);

const openNodeConfiguration = () => {
  if (!selectedNode.value) {
    return;
  }

  const nodeId = selectedNode.value.id;
  store.dispatch("workflow/openNodeConfiguration", nodeId);
};
</script>

<template>
  <!-- PLACEHOLDER - LEGACY DIALOGS -->
  <div v-if="hasLegacyDialog" class="placeholder full-height">
    <template v-if="isDesktop">
      <span class="placeholder-text">
        This node dialog is not supported here.
      </span>

      <Button with-border compact class="button" @click="openNodeConfiguration">
        <CogIcon />
        <span>Open dialog</span>
      </Button>
    </template>

    <template v-else>
      <span v-if="isMetanode" class="placeholder-text">
        Select a node to show its dialog.
      </span>

      <template v-else-if="uiControls.shouldDisplayDownloadAPButton">
        <span class="placeholder-text">
          To configure nodes with a classic dialog, download the KNIME Analytics
          Platform.
        </span>
        <DownloadAPButton compact src="node-configuration-panel" />
      </template>

      <span v-else class="placeholder-text">
        This node dialog is not supported here.
      </span>
    </template>
  </div>

  <!-- PLACEHOLDER - DEFAULT -->
  <div v-if="!selectedNode" class="placeholder full-height">
    <span class="placeholder-text">Select a node to show its dialog.</span>
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
