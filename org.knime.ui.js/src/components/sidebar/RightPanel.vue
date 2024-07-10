<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/composables/useStore";
import type { KnimeNode } from "@/api/custom-types";
import Button from "webapps-common/ui/components/Button.vue";
import CogIcon from "@knime/styles/img/icons/cog.svg";

import DownloadAPButton from "@/components/common/DownloadAPButton.vue";

import NodeConfigWrapper from "@/components/uiExtensions/nodeConfig/NodeConfigWrapper.vue";

const store = useStore();

// Computed properties
const selectedNode = computed<KnimeNode>(
  () => store.getters["selection/singleSelectedNode"],
);

const showDownloadButton = computed(
  () => store.state.application.permissions.showFloatingDownloadButton,
);
const hasLegacyDialog = computed(() =>
  Boolean(selectedNode.value && !selectedNode.value.hasDialog),
);

const isMetanode = computed(() => selectedNode.value.kind === "metanode");

// Callback methods
const openNodeConfiguration = () => {
  const nodeId = selectedNode.value.id;
  store.dispatch("workflow/openNodeConfiguration", nodeId);
};
</script>

<template>
  <div id="right-panel" class="panel full-height">
    <NodeConfigWrapper class="full-height">
      <template #inactive>
        <!-- PLACEHOLDER - LEGACY DIALOGS -->
        <div v-if="hasLegacyDialog" class="placeholder full-height">
          <template v-if="showDownloadButton">
            <span v-if="isMetanode" class="placeholder-text">
              Please select one node.
            </span>
            <template v-else>
              <span class="placeholder-text">
                To configure nodes with a classic dialog, download the KNIME
                Analytics Platform.
              </span>
              <DownloadAPButton compact src="node-configuration-panel" />
            </template>
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
        <div v-if="!selectedNode" class="placeholder full-height">
          <span class="placeholder-text">Please select one node.</span>
        </div>
      </template>
    </NodeConfigWrapper>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.full-height {
  height: 100%;
}

.panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--knime-gray-ultra-light);

  & .placeholder {
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
}
</style>
