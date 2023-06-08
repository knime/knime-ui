<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapState, mapActions, mapGetters } from "vuex";
import { mixin as VueClickAway } from "vue3-click-away";

import type {
  Bounds,
  WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { Annotation } from "@/api/gateway-api/generated-api";

import { getMetaOrCtrlKey } from "@/util/navigator";
import TransformControls from "./TransformControls.vue";
import LegacyAnnotation from "./LegacyAnnotation.vue";
import RichTextAnnotation from "./RichTextAnnotation.vue";

/**
 * A workflow annotation, a rectangular box containing text.
 */
export default defineComponent({
  components: {
    LegacyAnnotation,
    RichTextAnnotation,
    TransformControls,
  },
  mixins: [VueClickAway],
  inheritAttrs: false,

  props: {
    annotation: {
      type: Object as PropType<WorkflowAnnotation>,
      required: true,
    },
  },

  emits: ["toggleEdit"],

  expose: ["setSelectionPreview"],

  data() {
    return {
      selectionPreview: null,

      hasEdited: false,
      newAnnotationData: {
        richTextContent: "",
        borderColor: "",
      },
    };
  },

  computed: {
    ...mapState("workflow", {
      projectId: (state) => state.activeWorkflow.projectId,
      activeWorkflowId: (state) => state.activeWorkflow.info.containerId,
      editableAnnotationId: (state) => state.editableAnnotationId,
      isDragging: (state) => state.isDragging,
    }),
    ...mapState("selection", ["selectedAnnotations"]),
    ...mapGetters("selection", [
      "isAnnotationSelected",
      "selectedNodeIds",
      "selectedConnections",
      "selectedAnnotationIds",
    ]),

    isSelected() {
      return this.isAnnotationSelected(this.annotation.id);
    },

    isEditing() {
      return this.annotation.id === this.editableAnnotationId;
    },

    showSelectionPlane() {
      if (this.isDragging) {
        return false;
      }

      if (this.selectionPreview === null) {
        return this.isSelected;
      }

      if (this.isSelected && this.selectionPreview === "hide") {
        return false;
      }

      return this.selectionPreview === "show" || this.isSelected;
    },

    showTransformControls() {
      if (this.isDragging) {
        return false;
      }

      const isMoreThanOneAnnotationSelected =
        this.selectedAnnotationIds.length > 1;
      const isOneOrMoreNodesSelected = this.selectedNodeIds.length >= 1;
      const isOneOrMoreConnectionsSelected =
        this.selectedConnections.length >= 1;
      let isMoreThanOneItemSelected =
        isMoreThanOneAnnotationSelected ||
        isOneOrMoreNodesSelected ||
        isOneOrMoreConnectionsSelected;

      return (
        this.isSelected && !isMoreThanOneItemSelected && this.showSelectionPlane
      );
    },

    isRichTextAnnotation() {
      return this.annotation.contentType === Annotation.ContentTypeEnum.Html;
    },

    initialRichTextAnnotationValue() {
      const recreateLinebreaks = (content: string) =>
        content.replaceAll("\r\n", "<br />");

      return this.isRichTextAnnotation
        ? this.annotation.text
        : recreateLinebreaks(this.annotation.text);
    },

    initialBorderColor() {
      return this.isRichTextAnnotation
        ? this.annotation.borderColor
        : this.$colors.defaultAnnotationBorderColor;
    },
  },

  mounted() {
    this.initializeData();
  },

  methods: {
    ...mapActions("selection", [
      "selectAnnotation",
      "deselectAnnotation",
      "deselectAllObjects",
    ]),
    ...mapActions("application", ["toggleContextMenu"]),

    initializeData() {
      this.newAnnotationData = {
        richTextContent: this.initialRichTextAnnotationValue,
        borderColor: this.initialBorderColor,
      };
    },

    async onLeftClick(event: PointerEvent) {
      const metaOrCtrlKey = getMetaOrCtrlKey();
      const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

      await this.$store.dispatch("selection/toggleAnnotationSelection", {
        annotationId: this.annotation.id,
        isMultiselect,
        isSelected: this.isSelected,
      });
    },

    onContextMenu(event: PointerEvent) {
      const metaOrCtrlKey = getMetaOrCtrlKey();
      const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

      if (!isMultiselect && !this.isSelected) {
        this.deselectAllObjects();
      }

      this.selectAnnotation(this.annotation.id);
      this.toggleContextMenu({ event });
    },

    setSelectionPreview(type: string) {
      this.selectionPreview = type;
    },

    transformAnnotation(bounds: Bounds) {
      this.$store.dispatch("workflow/transformWorkflowAnnotation", {
        bounds,
        annotationId: this.annotation.id,
      });
    },

    toggleEdit() {
      this.$store.dispatch(
        "workflow/setEditableAnnotationId",
        this.isEditing ? null : this.annotation.id
      );
    },

    async onClickAway() {
      if (!this.isEditing) {
        return;
      }

      if (this.hasEdited) {
        await this.$store.dispatch("workflow/updateAnnotation", {
          annotationId: this.annotation.id,
          text: this.newAnnotationData.richTextContent,
          borderColor: this.newAnnotationData.borderColor,
        });
      }

      this.toggleEdit();
    },

    onAnnotationChange(content: string) {
      this.hasEdited = true;
      this.newAnnotationData.richTextContent = content;
    },

    setColor(color: string) {
      this.hasEdited = true;
      this.newAnnotationData.borderColor = color;
    },
  },
});
</script>

<template>
  <TransformControls
    v-click-away="onClickAway"
    :show-transform-controls="showTransformControls"
    :show-selection="showSelectionPlane"
    :initial-value="annotation.bounds"
    @transform-end="transformAnnotation($event.bounds)"
    @click="onLeftClick"
    @pointerdown.right.stop="onContextMenu"
  >
    <template #default="{ transformedBounds }">
      <foreignObject
        :x="transformedBounds.x"
        :y="transformedBounds.y"
        :width="transformedBounds.width"
        :height="transformedBounds.height"
      >
        <LegacyAnnotation
          v-if="!isRichTextAnnotation && !isEditing"
          :annotation="annotation"
          @edit-start="toggleEdit"
        />

        <RichTextAnnotation
          v-if="isRichTextAnnotation || isEditing"
          :id="annotation.id"
          :initial-value="initialRichTextAnnotationValue"
          :initial-border-color="initialBorderColor"
          :editable="isEditing"
          :is-dragging="isDragging"
          :annotation-bounds="transformedBounds"
          :is-selected="isSelected"
          @change="onAnnotationChange"
          @change-border-color="setColor"
          @edit-start="toggleEdit"
        />
      </foreignObject>
    </template>
  </TransformControls>
</template>

<style lang="postcss" scoped>
div {
  font-family: "Roboto Condensed", sans-serif;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
}
</style>
