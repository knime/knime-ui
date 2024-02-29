<script setup lang="ts">
import { computed, watch } from "vue";
import { useStore } from "@/composables/useStore";
import ContextMenu from "@/components/application/ContextMenu.vue";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas.vue";
import PortTypeMenu from "@/components/workflow/ports/PortTypeMenu.vue";
import QuickAddNodeMenu from "@/components/workflow/node/quickAdd/QuickAddNodeMenu.vue";
import WorkflowInfoBar from "./WorkflowInfoBar/WorkflowInfoBar.vue";
import RightPanel from "../sidebar/RightPanel.vue";
import SplitPanel from "../common/SplitPanel.vue";

const store = useStore();

const workflow = computed(() => store.state.workflow.activeWorkflow);
const activeWorkflowId = computed(
  () => store.state.workflow.activeWorkflow!.info.containerId,
);
const portTypeMenu = computed(() => store.state.workflow.portTypeMenu);
const quickAddNodeMenu = computed(() => store.state.workflow.quickAddNodeMenu);
const contextMenu = computed(() => store.state.application.contextMenu);
const isWritable = computed(() => store.getters["workflow/isWritable"]);
const isWorkflowEmpty = computed(
  () => store.getters["workflow/isWorkflowEmpty"],
);
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

const toggleContextMenu = (event: unknown) => {
  // this is not the only place where it is activated, look into Kanvas (usePanning.stopPan)
  // where an unsuccessful pan by right click also opens it
  store.dispatch("application/toggleContextMenu", { event });
};

const onContextMenu = (event: MouseEvent) => {
  // this is the only place where we handle native context menu events
  if (
    event.target &&
    (event.target as HTMLElement).classList.contains("native-context-menu")
  ) {
    return;
  }
  // prevent native context menus to appear
  event.preventDefault();

  // trigger it for empty workflows as we don't have a pan there
  if (isWorkflowEmpty.value) {
    toggleContextMenu(event);
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
    @contextmenu.stop="onContextMenu"
    @pointerdown.right="contextMenu.isOpen && toggleContextMenu($event)"
  >
    <ContextMenu
      v-if="contextMenu.isOpen"
      :position="contextMenu.position!"
      @menu-close="toggleContextMenu"
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
      id="kanvasOutputSplitter"
      v-model:secondary-size="nodeDialogSize"
      direction="right"
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
