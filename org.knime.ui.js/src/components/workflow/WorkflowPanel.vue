<script setup lang="ts">
import { computed, watch } from "vue";
import { useStore } from "@/composables/useStore";
import { useFeatures } from "@/plugins/feature-flags";
import ContextMenu from "@/components/application/ContextMenu.vue";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas.vue";
import PortTypeMenu from "@/components/workflow/ports/NodePorts/PortTypeMenu.vue";
import QuickAddNodeMenu from "@/components/workflow/node/quickAdd/QuickAddNodeMenu.vue";
import SplitPanel from "@/components/common/SplitPanel.vue";
import RightPanel from "@/components/sidebar/RightPanel.vue";
import WorkflowInfoBar from "./WorkflowInfoBar/WorkflowInfoBar.vue";

const $features = useFeatures();
const store = useStore();

const workflow = computed(() => store.state.workflow.activeWorkflow);
const activeWorkflowId = computed(
  () => store.state.workflow.activeWorkflow!.info.containerId,
);
const portTypeMenu = computed(() => store.state.workflow.portTypeMenu);
const quickAddNodeMenu = computed(() => store.state.workflow.quickAddNodeMenu);
const contextMenu = computed(() => store.state.application.contextMenu);
const isWritable = computed(() => store.getters["workflow/isWritable"]);

const selectedNodeIds = computed(
  () => store.getters["selection/selectedNodeIds"],
);
const hasAnnotationModeEnabled = computed(
  () => store.getters["application/hasAnnotationModeEnabled"],
);
const nodeDialogSize = computed({
  get() {
    return store.state.settings.settings.nodeDialogSize;
  },
  set(value: number) {
    store.dispatch("settings/updateSetting", {
      key: "nodeDialogSize",
      value,
    });
  },
});

watch(selectedNodeIds, () => {
  if (quickAddNodeMenu.value.isOpen) {
    quickAddNodeMenu.value.events.menuClose?.();
  }
});

const closeContextMenu = (event: unknown) => {
  if (contextMenu.value.isOpen) {
    store.dispatch("application/toggleContextMenu", { event });
  }
};
</script>

<template>
  <div
    :class="[
      'workflow-panel',
      { 'read-only': !isWritable },
      { 'annotation-cursor': hasAnnotationModeEnabled },
    ]"
    @pointerdown.right="closeContextMenu($event)"
  >
    <ContextMenu
      v-if="contextMenu.isOpen"
      :position="contextMenu.position!"
      @menu-close="closeContextMenu"
    />

    <PortTypeMenu
      v-if="portTypeMenu.isOpen"
      v-bind="portTypeMenu.props!"
      v-on="portTypeMenu.events"
    />

    <QuickAddNodeMenu
      v-if="quickAddNodeMenu.isOpen"
      v-bind="quickAddNodeMenu.props!"
      v-on="quickAddNodeMenu.events"
    />

    <PortalTarget name="annotation-editor-toolbar" tag="div" />

    <WorkflowInfoBar />

    <SplitPanel
      v-if="$features.shouldDisplayEmbeddedDialogs()"
      v-model:secondary-size="nodeDialogSize"
      data-test-id="node-config-split-panel"
      direction="right"
      use-pixel
      :secondary-snap-size="360"
      :secondary-max-size="900"
      style="--splitter-background-color: var(--knime-gray-ultra-light)"
      keep-element-on-close
    >
      <!--
      Setting key to match exactly one workflow, causes knime-ui to re-render the whole component,
      instead of diffing old and new workflow.
    -->
      <WorkflowCanvas :key="`${workflow!.projectId}-${activeWorkflowId}`" />
      <template #secondary>
        <RightPanel id="right-panel" />
      </template>
    </SplitPanel>

    <WorkflowCanvas
      v-else
      :key="`${workflow!.projectId}-${activeWorkflowId}`"
    />
  </div>
</template>

<style lang="postcss" scoped>
.workflow-panel {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.read-only {
  background-color: var(--knime-gray-ultra-light);
}

.annotation-cursor {
  cursor: crosshair;
}
</style>
