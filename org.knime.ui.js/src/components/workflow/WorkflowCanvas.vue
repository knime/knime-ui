<script>
import { mapGetters, mapMutations, mapActions, mapState } from "vuex";
import { TABS } from "@/store/panel";
import Workflow from "@/components/workflow/Workflow.vue";
import Kanvas from "@/components/workflow/kanvas/Kanvas.vue";
import SelectionRectangle from "@/components/workflow/SelectionRectangle.vue";
import AnnotationRectangle from "@/components/workflow/annotations/AnnotationRectangle.vue";
import WorkflowEmpty from "@/components/workflow/WorkflowEmpty.vue";
import KanvasFilters from "@/components/workflow/kanvas/KanvasFilters.vue";

import { dropNode } from "@/mixins";

export default {
  components: {
    Workflow,
    Kanvas,
    SelectionRectangle,
    AnnotationRectangle,
    WorkflowEmpty,
    KanvasFilters,
  },
  mixins: [dropNode],
  computed: {
    ...mapGetters("application", [
      "workflowCanvasState",
      "hasAnnotationModeEnabled",
    ]),
    ...mapGetters("canvas", ["contentBounds"]),
    ...mapGetters("workflow", ["isWorkflowEmpty"]),
    ...mapState("nodeRepository", {
      isDraggingNodeFromRepository: "isDraggingNode",
    }),
    ...mapState("canvas", ["zoomFactor"]),
    ...mapState("workflow", ["activeWorkflow"]),
  },
  watch: {
    isWorkflowEmpty: {
      immediate: true,
      async handler(isWorkflowEmpty) {
        // disable zoom & pan if workflow is empty
        this.setIsEmpty(isWorkflowEmpty);

        if (isWorkflowEmpty) {
          // call to action: move nodes onto workflow
          await this.setCurrentProjectActiveTab(TABS.NODE_REPOSITORY);

          // for an empty workflow "fillScreen" zooms to 100% and moves the origin (0,0) to the center
          await this.$nextTick();
          this.fillScreen();
        }
      },
    },
  },
  mounted() {
    if (this.isWorkflowEmpty) {
      this.setCurrentProjectActiveTab(TABS.NODE_REPOSITORY);
    }

    this.$nextTick(() => {
      // put canvas into fillScreen view after loading the workflow
      // if there isn't a saved canvas state for it
      if (!this.workflowCanvasState) {
        this.fillScreen();
      }
    });
  },
  methods: {
    ...mapMutations("canvas", ["setIsEmpty"]),
    ...mapActions("panel", ["setCurrentProjectActiveTab"]),
    ...mapActions("canvas", ["fillScreen"]),
    ...mapActions("application", ["resetCanvasMode"]),
    onNodeSelectionPreview($event) {
      this.$refs.workflow.applyNodeSelectionPreview($event);
    },
    onAnnotationPreview($event) {
      this.$refs.workflow.applyAnnotationSelectionPreview($event);
    },
    async onContainerSizeUpdated() {
      if (this.isWorkflowEmpty) {
        await this.$nextTick();

        // scroll to center
        this.fillScreen();
      }
    },
  },
};
</script>

<template>
  <Kanvas
    id="kanvas"
    ref="kanvas"
    :class="{
      'indicate-node-drag': isWorkflowEmpty && isDraggingNodeFromRepository,
    }"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
    @container-size-changed="onContainerSizeUpdated"
    @keydown.esc="!hasSelectionModeEnabled && resetCanvasMode()"
  >
    <!-- Includes shadows for Nodes -->
    <KanvasFilters />

    <WorkflowEmpty v-if="isWorkflowEmpty" />
    <template v-else>
      <rect
        class="workflow-sheet"
        :x="contentBounds.left"
        :y="contentBounds.top"
        :width="contentBounds.width"
        :height="contentBounds.height"
      />

      <Workflow ref="workflow" />
    </template>

    <!-- The Annotation- and SelectionRectangle register to the selection-pointer{up,down,move} events of their parent (the Kanvas) -->
    <AnnotationRectangle v-if="hasAnnotationModeEnabled" />
    <SelectionRectangle
      v-else
      @node-selection-preview="onNodeSelectionPreview"
      @annotation-selection-preview="onAnnotationPreview"
    />
  </Kanvas>
</template>

<style scoped>
#kanvas :deep(svg) {
  color: var(--knime-masala);
  background-color: white;
  transition: background-color 150ms;
}

#kanvas.indicate-node-drag :deep(svg) {
  background-color: var(--knime-gray-ultra-light);
}

.workflow-sheet {
  fill: white;
  pointer-events: none;
}
</style>
