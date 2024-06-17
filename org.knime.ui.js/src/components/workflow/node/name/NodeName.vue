<script>
import { mapState, mapActions } from "vuex";

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
    ...mapState("workflow", ["nameEditorNodeId"]),
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
    ...mapActions("workflow", [
      "renameContainerNode",
      "openNameEditor",
      "closeNameEditor",
    ]),
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
        this.$store.dispatch("canvas/focus");
      }, 100);
    },
    onCancel() {
      this.closeNameEditor();
      this.$store.dispatch("canvas/focus");
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
