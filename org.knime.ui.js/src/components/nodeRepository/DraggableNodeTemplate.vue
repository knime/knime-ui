<script>
import { mapActions, mapGetters, mapState } from "vuex";
import { useDropNode } from "@/composables/useDropNode";
import NodeTemplate from "@/components/nodeRepository/NodeTemplate/NodeTemplate.vue";
import { useAddNodeToWorkflow } from "./useAddNodeToWorkflow";
/**
 * This component was ripped out of NodeTemplate to make NodeTemplate re-useable. This makes still heavy use of the
 * store and might be further improved by emitting events and let the parents handle the store actions.
 */
export default {
  components: {
    NodeTemplate,
  },
  props: {
    displayMode: {
      type: String,
      default: "icon",
    },
    nodeTemplate: {
      type: Object,
      default: null,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
    isHighlighted: {
      type: Boolean,
      default: false,
    },
    isDescriptionActive: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["showNodeDescription"],
  setup() {
    const addNodeToWorkflow = useAddNodeToWorkflow();
    const { KnimeMIME } = useDropNode();
    return { addNodeToWorkflow, KnimeMIME };
  },
  data() {
    return {
      dragGhost: null,
      shouldShowDescriptionOnAbort: false,
    };
  },
  computed: {
    ...mapState("panel", ["isExtensionPanelOpen"]),
    ...mapState("workflow", { workflow: "activeWorkflow" }),
    ...mapGetters("workflow", ["isWritable"]),
    ...mapGetters("canvas", ["getVisibleFrame"]),
    ...mapGetters("selection", ["selectedNodes"]),
  },
  methods: {
    ...mapActions("nodeTemplates", ["setDraggingNodeTemplate"]),

    onDragStart(e) {
      // close description panel
      this.shouldShowDescriptionOnAbort =
        this.isSelected && this.isExtensionPanelOpen;
      this.$store.dispatch("panel/closeExtensionPanel");
      this.setDraggingNodeTemplate(this.nodeTemplate);

      // Fix for cursor style for Firefox
      if (!this.isWritable && navigator.userAgent.indexOf("Firefox") !== -1) {
        e.currentTarget.style.cursor = "not-allowed";
      }
      // clone node preview
      this.dragGhost = this.$refs.nodeTemplate
        .getNodePreview()
        .$el.cloneNode(true);

      // position it outside the view of the user
      this.dragGhost.style.position = "absolute";
      this.dragGhost.style.left = "-100px";
      this.dragGhost.style.top = "0px";
      this.dragGhost.style.width = "70px";
      this.dragGhost.style.height = "70px";
      document.body.appendChild(this.dragGhost);

      // this ensures no other element (like the name) will be part of the drag-ghost bitmap
      const dragGhostRect = this.dragGhost.getBoundingClientRect();

      // 'screenshot' cloned node for use as drag-ghost. position it, s.th. cursor is in the middle
      e.dataTransfer.setDragImage(
        this.dragGhost,
        dragGhostRect.width / 2,
        dragGhostRect.height / 2,
      );

      e.dataTransfer.setData("text/plain", this.nodeTemplate.id);
      e.dataTransfer.setData(
        this.KnimeMIME,
        JSON.stringify(this.nodeTemplate.nodeFactory),
      );
    },
    onDragEnd(e) {
      e.target.style.cursor = "pointer";
      this.setDraggingNodeTemplate(null);

      // remove cloned node preview
      if (this.dragGhost) {
        document.body.removeChild(this.dragGhost);
        this.dragGhost = null;
      }

      // ending with dropEffect none indicates that dragging has been aborted
      if (e.dataTransfer.dropEffect === "none") {
        this.onDragAbort();
      }
    },
    onDragAbort() {
      // if drag is aborted and node was showing the description before, show it again
      if (this.shouldShowDescriptionOnAbort) {
        this.$emit("showNodeDescription");
      }
    },
    onDoubleClick() {
      this.addNodeToWorkflow(this.nodeTemplate);
    },
    onDrag(e) {
      if (!this.isWritable) {
        e.currentTarget.style.cursor = "not-allowed";
      }
    },
  },
};
</script>

<template>
  <NodeTemplate
    ref="nodeTemplate"
    draggable="true"
    :node-template="nodeTemplate"
    :display-mode="displayMode"
    :is-selected="isSelected"
    :is-highlighted="isHighlighted"
    :is-description-active="isDescriptionActive"
    :show-floating-help-icon="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dblclick="onDoubleClick"
    @drag="onDrag"
    @help-icon-click="$emit('showNodeDescription')"
  />
</template>
