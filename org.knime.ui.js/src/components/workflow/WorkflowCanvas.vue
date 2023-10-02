<script>
import { mapGetters, mapActions, mapState } from "vuex";
import Workflow from "@/components/workflow/Workflow.vue";
import Kanvas from "@/components/workflow/kanvas/Kanvas.vue";
import SelectionRectangle from "@/components/workflow/SelectionRectangle/SelectionRectangle.vue";
import AnnotationRectangle from "@/components/workflow/annotations/AnnotationRectangle.vue";
import WorkflowEmpty from "@/components/workflow/WorkflowEmpty.vue";
import KanvasFilters from "@/components/workflow/kanvas/KanvasFilters.vue";
import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue"
import ComponentView from "./ComponentView.vue"

import { dropNode } from "@/mixins";

export default {
  components: {
    Workflow,
    Kanvas,
    SelectionRectangle,
    AnnotationRectangle,
    WorkflowEmpty,
    KanvasFilters,
    ValueSwitch,
    ComponentView
  },
  mixins: [dropNode],
  data() {
    return {
      switchMode: "kanvas",
    }
  },
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
        if (isWorkflowEmpty) {
          // call to action: move nodes onto workflow
          // for an empty workflow "fillScreen" zooms to 100% and moves the origin (0,0) to the center
          await this.$nextTick();
          this.fillScreen();
        }
      },
    },
  },
  mounted() {
    this.$nextTick(() => {
      // put canvas into fillScreen view after loading the workflow
      // if there isn't a saved canvas state for it
      if (!this.workflowCanvasState) {
        this.fillScreen();
      }
    });
  },
  methods: {
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
  <ValueSwitch
  v-model="switchMode"
  class="valueSwitch" :possible-values="[
    { id: 'kanvas', text: 'Kanvas' },
    { id: 'component', text: 'Component View' },
  ]"/>
  <Kanvas
    id="kanvas"
    ref="kanvas"
    :class="{
      'indicate-node-drag': isWorkflowEmpty && isDraggingNodeFromRepository,
    }"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
    @container-size-changed="onContainerSizeUpdated"
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
  <ComponentView v-if="switchMode !== 'kanvas'" class="pagebuilder"/>
</template>

<style scoped>
.container {
  display: flex;
}

.pagebuilder {
  position: absolute;
  top: 95px;
  left: 80%;
  overflow: auto;
  height: 100%;
  box-shadow: 10px 5px 5px 10px var(--knime-masala);
}

#kanvas :deep(svg) {
  color: var(--knime-masala);
  background-color: white;
  transition: background-color 150ms;
}

.value-switch {
  position: absolute;
  top: 53px;
  left: 500px;
}

#kanvas.indicate-node-drag :deep(svg) {
  background-color: var(--knime-gray-ultra-light);
}

.workflow-sheet {
  fill: white;
  pointer-events: none;
}
</style>
