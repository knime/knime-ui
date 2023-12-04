<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapGetters } from "vuex";
import ContextMenu from "@/components/application/ContextMenu.vue";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas.vue";
import PortTypeMenu from "@/components/workflow/ports/PortTypeMenu.vue";
import QuickAddNodeMenu from "@/components/workflow/node/quickAdd/QuickAddNodeMenu.vue";
import type { Workflow } from "@/api/gateway-api/generated-api";
import WorkflowInfoBar from "./WorkflowInfoBar/WorkflowInfoBar.vue";

export default defineComponent({
  components: {
    ContextMenu,
    WorkflowCanvas,
    QuickAddNodeMenu,
    PortTypeMenu,
    WorkflowInfoBar,
  },
  computed: {
    ...mapState("workflow", {
      workflow: (state) =>
        state.activeWorkflow as Workflow & { projectId: string },
      activeWorkflowId: (state) =>
        state.activeWorkflow.info.containerId as string,
    }),
    ...mapState("workflow", ["portTypeMenu", "quickAddNodeMenu"]),
    ...mapState("application", ["contextMenu"]),
    ...mapGetters("workflow", [
      "isLinked",
      "isInsideLinked",
      "insideLinkedType",
      "isWritable",
      "isStreaming",
      "isRemoteWorkflow",
    ]),
    ...mapGetters("canvas", ["screenToCanvasCoordinates"]),
    ...mapGetters("selection", ["selectedNodeIds"]),
    ...mapGetters("application", [
      "hasActiveProjectAnOrigin",
      "hasAnnotationModeEnabled",
    ]),
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
    toggleContextMenu(event) {
      // this is not the only place where it is activated, look into Kanvas
      // where an unsuccessful pan by right click also opens it
      this.$store.dispatch("application/toggleContextMenu", { event });
    },
    onContextMenu(event) {
      // this is the only place where we handle native context menu events
      if (event.srcElement.classList.contains("native-context-menu")) {
        return;
      }
      // prevent native context menus to appear
      event.preventDefault();
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

    <!--
      Setting key to match exactly one workflow, causes knime-ui to re-render the whole component,
      instead of diffing old and new workflow.
    -->
    <WorkflowCanvas :key="`${workflow.projectId}-${activeWorkflowId}`" />
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
