<script setup lang="ts">
import Workflow from "./Workflow.vue";
import Kanvas from "./kanvas/Kanvas.vue";

// import AnnotationRectangle from "@/components/workflow/annotations/AnnotationRectangle.vue";
// import WorkflowEmpty from "@/components/workflow/WorkflowEmpty.vue";
// import KanvasFilters from "@/components/workflow/kanvas/KanvasFilters.vue";

// import { dropNode } from "@/mixins";

// export default {
//   components: {
//     Workflow,
//     Kanvas,
//     SelectionRectangle,
//     AnnotationRectangle,
//     WorkflowEmpty,
//     KanvasFilters,
//     KanvasPixi,
//   },
//   mixins: [dropNode],
//   computed: {
//     ...mapGetters("application", [
//       "workflowCanvasState",
//       "hasAnnotationModeEnabled",
//     ]),
//     ...mapGetters("canvas", ["contentBounds"]),
//     ...mapGetters("workflow", ["isWorkflowEmpty"]),
//     ...mapState("nodeRepository", {
//       isDraggingNodeFromRepository: "isDraggingNode",
//     }),
//     ...mapState("canvas", ["zoomFactor"]),
//     ...mapState("workflow", ["activeWorkflow"]),
//   },
//   watch: {
//     isWorkflowEmpty: {
//       immediate: true,
//       async handler(isWorkflowEmpty) {
//         // disable zoom & pan if workflow is empty
//         if (isWorkflowEmpty) {
//           // call to action: move nodes onto workflow
//           // for an empty workflow "fillScreen" zooms to 100% and moves the origin (0,0) to the center
//           await this.$nextTick();
//           this.fillScreen();
//         }
//       },
//     },
//   },
//   mounted() {
//     this.$nextTick(() => {
//       // put canvas into fillScreen view after loading the workflow
//       // if there isn't a saved canvas state for it
//       if (!this.workflowCanvasState) {
//         this.fillScreen();
//       }
//     });
//   },
//   methods: {
//     ...mapActions("canvas", ["fillScreen"]),
//     ...mapActions("application", ["resetCanvasMode"]),

//     onNodeSelectionPreview($event) {
//       this.$refs.workflow.applyNodeSelectionPreview($event);
//     },
//     onAnnotationPreview($event) {
//       this.$refs.workflow.applyAnnotationSelectionPreview($event);
//     },
//     async onContainerSizeUpdated() {
//       if (this.isWorkflowEmpty) {
//         await this.$nextTick();

//         // scroll to center
//         this.fillScreen();
//       }
//     },
//   },
// };
</script>

<template>
  <Kanvas>
    <Workflow />
  </Kanvas>
</template>
