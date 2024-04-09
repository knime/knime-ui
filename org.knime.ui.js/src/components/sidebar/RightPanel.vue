<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/composables/useStore";
import { NodeState } from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/custom-types";
import Button from "webapps-common/ui/components/Button.vue";
import CogIcon from "webapps-common/ui/assets/img/icons/cog.svg";

import DownloadAPButton from "@/components/common/DownloadAPButton.vue";

import NodeConfigWrapper from "@/components/uiExtensions/nodeConfig/NodeConfigWrapper.vue";

const store = useStore();

// Computed properties
const selectedNode = computed<KnimeNode>(
  () => store.getters["selection/singleSelectedNode"],
);
const showNodeDialog = computed(() => Boolean(selectedNode.value?.hasDialog));
const showDownloadButton = computed(
  () => store.state.application.permissions.showDownloadAPButton,
);

const isNodeExecuting = computed(() =>
  Boolean(
    selectedNode.value?.state?.executionState ===
      NodeState.ExecutionStateEnum.EXECUTING ||
      selectedNode.value?.state?.executionState ===
        NodeState.ExecutionStateEnum.QUEUED,
  ),
);

const hasLegacyDialog = computed(() =>
  Boolean(selectedNode.value && !selectedNode.value.hasDialog),
);

// Callback methods
const openNodeConfiguration = () => {
  const nodeId = selectedNode.value.id;
  store.dispatch("workflow/openNodeConfiguration", nodeId);
};
</script>

<template>
  <div
    id="right-panel"
    class="panel"
    :class="{ disabled: isNodeExecuting && !hasLegacyDialog }"
  >
    <NodeConfigWrapper
      v-if="showNodeDialog"
      :class="{ 'panel-dialog-disabled': isNodeExecuting }"
    />

    <!-- PLACEHOLDER - LEGACY DIALOGS -->
    <div v-else-if="hasLegacyDialog" class="placeholder">
      <template v-if="showDownloadButton">
        <span class="placeholder-text">
          To configure nodes with a classic dialog, download the KNIME Analytics
          Platform.
        </span>
        <DownloadAPButton compact src="node-configuration-panel" />
      </template>
      <template v-else>
        <span class="placeholder-text">
          This node dialog is not supported here.
        </span>
        <Button
          with-border
          compact
          class="button"
          @click="openNodeConfiguration"
        >
          <CogIcon />
          <span>Open legacy dialog</span>
        </Button>
      </template>
    </div>

    <!-- PLACEHOLDER - DEFAULT -->
    <div v-else class="placeholder">
      <span class="placeholder-text">Please select a node.</span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--knime-gray-ultra-light);

  &.disabled {
    cursor: not-allowed;
  }

  & .panel-dialog-disabled {
    opacity: 0.5;
    pointer-events: none;
    transition: opacity 150ms ease-out;
    user-select: none;
  }

  & .placeholder {
    display: flex;
    height: 100%;
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
}
</style>
