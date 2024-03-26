<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";
import NodeDialogLoader from "@/components/uiExtensions/nodeDialogs/NodeDialogLoader.vue";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import Button from "webapps-common/ui/components/Button.vue";
import CogIcon from "webapps-common/ui/assets/img/icons/cog.svg";
import { isBrowser } from "@/environment";

const store = useStore();

// Computed properties
const projectId = computed(() => store.state.application.activeProjectId);
const workflowId = computed(
  () => store.state.workflow.activeWorkflow.info.containerId,
);
const selectedNode = computed(
  () => store.getters["selection/singleSelectedNode"],
);
const showNodeDialog = computed(() => Boolean(selectedNode.value?.hasDialog));
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
  <div id="right-panel" class="panel">
    <NodeDialogLoader
      v-if="showNodeDialog"
      :project-id="projectId"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
    />
    <template v-else-if="hasLegacyDialog">
      <div class="placeholder">
        <template v-if="isBrowser">
          <span class="placeholder-text">
            To configure nodes with a classic dialog, download the KNIME
            Analytics Platform.
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
    </template>
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
  }
}
</style>
