<script>
import { mapActions, mapState } from "pinia";

import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

import NodeLabelEditor from "./NodeLabelEditor.vue";
import NodeLabelText from "./NodeLabelText.vue";

export default {
  components: {
    NodeLabelText,
    NodeLabelEditor,
  },
  props: {
    nodeId: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      default: "",
    },
    kind: {
      type: String,
      default: "",
    },
    nodePosition: {
      type: Object,
      required: true,
    },
    editable: {
      type: Boolean,
      default: false,
    },
    annotation: {
      type: Object,
      required: false,
      default: () => {},
    },
    numberOfPorts: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  emits: [
    "editStart",
    "widthChange",
    "heightChange",
    "mouseleave",
    "mouseenter",
  ],
  computed: {
    ...mapState(useNodeInteractionsStore, ["labelEditorNodeId"]),
    ...mapState(useSelectionStore, ["singleSelectedNode"]),
    isEditing() {
      return this.nodeId === this.labelEditorNodeId;
    },

    isSelected() {
      return this.nodeId === this.singleSelectedNode?.id;
    },
    portOffset() {
      // max port number that works without offset
      const metanodeMaxSupportedPorts = 2;
      const nodeMaxSupportedPorts = 5;

      const maxSupportedNumberOfPorts =
        this.kind === "metanode"
          ? metanodeMaxSupportedPorts
          : nodeMaxSupportedPorts;

      return (
        Math.max(this.numberOfPorts - maxSupportedNumberOfPorts, 0) *
        this.$shapes.portSize
      );
    },
  },
  methods: {
    ...mapActions(useNodeInteractionsStore, [
      "renameNodeLabel",
      "openLabelEditor",
      "closeLabelEditor",
    ]),
    ...mapActions(useSVGCanvasStore, { focusCanvas: "focus" }),
    onRequestEdit() {
      this.openLabelEditor(this.nodeId);
    },
    onSave({ newLabel }) {
      this.renameNodeLabel({ nodeId: this.nodeId, label: newLabel });

      // Schedule closing editor on next the event loop run
      // to allow styles to apply properly when editor is destroyed
      setTimeout(() => {
        this.closeLabelEditor();
        this.focusCanvas();
      }, 100);
    },
    onCancel() {
      this.closeLabelEditor();
      this.focusCanvas();
    },
  },
};
</script>

<template>
  <g>
    <template v-if="isEditing">
      <portal to="node-text-editor">
        <NodeLabelEditor
          :node-id="nodeId"
          :value="value"
          :kind="kind"
          :node-position="nodePosition"
          :port-offset="portOffset"
          @save="onSave"
          @cancel="onCancel"
        />
      </portal>
    </template>
    <template v-else>
      <NodeLabelText
        :node-id="nodeId"
        :value="value"
        :kind="kind"
        :annotation="annotation"
        :editable="editable"
        :is-selected="isSelected"
        :port-offset="portOffset"
        @request-edit="onRequestEdit"
      />
    </template>
  </g>
</template>
