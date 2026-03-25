<script>
import { mapActions, mapState } from "pinia";

import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

import NodeNameEditor from "./NodeNameEditor.vue";
import NodeNameText from "./NodeNameText.vue";

/**
 * Node name coordinates everything related to the name editing behavior. Determines whether to display
 * the editor or the label itself, as well as handles updates to the store when name changes are made
 */
export default {
  components: { NodeNameEditor, NodeNameText },
  props: {
    nodeId: {
      type: String,
      required: true,
    },
    nodePosition: {
      type: Object,
      required: true,
    },
    editable: {
      type: Boolean,
      default: false,
    },
    value: {
      type: String,
      default: "",
    },
  },
  emits: [
    "editStart",
    "widthChange",
    "heightChange",
    "mouseleave",
    "mouseenter",
  ],
  data() {
    return {
      editorInitialDimensions: {
        width: null,
        height: null,
      },
    };
  },
  computed: {
    ...mapState(useNodeInteractionsStore, ["nameEditorNodeId"]),

    isEditing() {
      return this.nodeId === this.nameEditorNodeId;
    },
  },
  watch: {
    // use store state to ensure edit-start is emitted even if someone else (e.g. shortcuts) started the edit
    isEditing(newValue) {
      if (newValue) {
        this.$emit("editStart");
      }
    },
  },
  methods: {
    ...mapActions(useNodeInteractionsStore, [
      "openNameEditor",
      "renameContainerNode",
      "closeNameEditor",
    ]),
    ...mapActions(useSVGCanvasStore, { focusCanvas: "focus" }),
    onRequestEdit() {
      this.openNameEditor(this.nodeId);
    },
    onSave({ dimensionsOnClose, newName }) {
      this.renameContainerNode({ nodeId: this.nodeId, name: newName });
      this.editorInitialDimensions = dimensionsOnClose;

      // Schedule closing editor on next the event loop run
      // to allow styles to apply properly when editor is destroyed
      setTimeout(() => {
        this.closeNameEditor();
        this.focusCanvas();
      }, 100);
    },
    onCancel() {
      this.closeNameEditor();
      this.focusCanvas();
    },
  },
};
</script>

<template>
  <g>
    <template v-if="isEditing">
      <Portal to="node-text-editor">
        <NodeNameEditor
          :node-id="nodeId"
          :node-position="nodePosition"
          :value="value"
          :start-width="editorInitialDimensions.width"
          :start-height="editorInitialDimensions.height"
          @width-change="$emit('widthChange', $event)"
          @height-change="$emit('heightChange', $event)"
          @save="onSave"
          @cancel="onCancel"
        />
      </Portal>
    </template>

    <template v-else>
      <NodeNameText
        :editable="editable"
        :value="value"
        @width-change="$emit('widthChange', $event)"
        @height-change="$emit('heightChange', $event)"
        @request-edit="onRequestEdit"
        @mouseleave="$emit('mouseleave', $event)"
        @mouseenter="$emit('mouseenter', $event)"
      />
    </template>
  </g>
</template>
