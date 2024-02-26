<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapGetters } from "vuex";
import ContextMenu from "@/components/application/ContextMenu.vue";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas.vue";
import PortTypeMenu from "@/components/workflow/ports/PortTypeMenu.vue";
import QuickAddNodeMenu from "@/components/workflow/node/quickAdd/QuickAddNodeMenu.vue";
import type { WorkflowState } from "@/store/workflow";
import type { SettingsState } from "@/store/settings";
import WorkflowInfoBar from "./WorkflowInfoBar/WorkflowInfoBar.vue";
import RightPanel from "../sidebar/RightPanel.vue";
import SplitPanel from "../common/SplitPanel.vue";

export default defineComponent({
  components: {
    ContextMenu,
    WorkflowCanvas,
    QuickAddNodeMenu,
    PortTypeMenu,
    WorkflowInfoBar,
    RightPanel,
    SplitPanel,
  },
  computed: {
    ...mapState("workflow", {
      workflow: (state: unknown) => (state as WorkflowState).activeWorkflow,
      activeWorkflowId: (state: unknown) =>
        (state as WorkflowState).activeWorkflow!.info.containerId,
    }),
    ...mapState("workflow", ["portTypeMenu", "quickAddNodeMenu"]),
    ...mapState("application", ["contextMenu"]),
    ...mapState("settings", {
      nodeOutputSize: (state: unknown) =>
        (state as SettingsState).settings.nodeOutputSize,
    }),
    ...mapGetters("workflow", [
      "isLinked",
      "isInsideLinked",
      "insideLinkedType",
      "isWritable",
      "isStreaming",
      "isWorkflowEmpty",
      "isRemoteWorkflow",
    ]),
    ...mapGetters("canvas", ["screenToCanvasCoordinates"]),
    ...mapGetters("selection", ["selectedNodeIds", "singleSelectedNode"]),
    ...mapGetters("application", [
      "hasActiveProjectAnOrigin",
      "hasAnnotationModeEnabled",
    ]),
    nodeDialogSize: {
      get() {
        return this.$store.state.settings.settings.nodeDialogSize;
      },
      set(value: number) {
        this.$store.dispatch("settings/updateSetting", {
          key: "nodeDialogSize",
          value,
        });
      },
    },
    showNodeDialog() {
      return Boolean(
        this.singleSelectedNode && this.singleSelectedNode?.hasDialog,
      );
    },
  },
  watch: {
    // close quickAddNodeMenu if node selection changes
    selectedNodeIds() {
      if (this.quickAddNodeMenu.isOpen) {
        this.quickAddNodeMenu.events.menuClose();
      }
    },
  },
  methods: {
    toggleContextMenu(event: unknown) {
      // this is not the only place where it is activated, look into Kanvas (usePanning.stopPan)
      // where an unsuccessful pan by right click also opens it
      this.$store.dispatch("application/toggleContextMenu", { event });
    },
    onContextMenu(event: MouseEvent) {
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
      if (this.isWorkflowEmpty) {
        this.toggleContextMenu(event);
      }
    },
    onSaveLocalCopy() {
      this.$store.dispatch("workflow/saveProjectAs");
    },
  },
});
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
      :position="contextMenu.position"
      @menu-close="toggleContextMenu"
    />

    <PortTypeMenu
      v-if="portTypeMenu.isOpen"
      v-bind="portTypeMenu.props"
      v-on="portTypeMenu.events"
    />

    <QuickAddNodeMenu
      v-if="quickAddNodeMenu.isOpen"
      v-bind="quickAddNodeMenu.props"
      v-on="quickAddNodeMenu.events"
    />

    <PortalTarget name="annotation-editor-toolbar" tag="div" />

    <WorkflowInfoBar />

    <SplitPanel
      id="kanvasOutputSplitter"
      v-model:secondary-size="nodeDialogSize"
      direction="right"
      :show-secondary-panel="showNodeDialog"
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
