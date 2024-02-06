<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapState, mapActions, mapGetters } from "vuex";
import { directive as clickAway } from "vue3-click-away";

import { getMetaOrCtrlKey } from "webapps-common/util/navigator";
import type {
  Bounds,
  WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { TypedText } from "@/api/gateway-api/generated-api";

import { recreateLinebreaks } from "@/util/recreateLineBreaks";
import type { WorkflowState } from "@/store/workflow";

import TransformControls from "./TransformControls.vue";
import LegacyAnnotation from "./LegacyAnnotation.vue";
import RichTextAnnotation from "./RichTextAnnotation.vue";

type ComponentData = {
  selectionPreview: string | null;

  hasEdited: boolean;
  newAnnotationData: {
    richTextContent: string;
    borderColor: string;
  };
};

/**
 * A workflow annotation, a rectangular box containing text.
 */
export default defineComponent({
  components: {
    LegacyAnnotation,
    RichTextAnnotation,
    TransformControls,
  },

  directives: { clickAway },
  inheritAttrs: false,

  props: {
    annotation: {
      type: Object as PropType<WorkflowAnnotation>,
      required: true,
    },
  },

  emits: ["toggleEdit"],

  expose: ["setSelectionPreview"],

  data(): ComponentData {
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
      projectId: (state: unknown) =>
        (state as WorkflowState).activeWorkflow!.projectId,
      activeWorkflowId: (state: unknown) =>
        (state as WorkflowState).activeWorkflow!.info.containerId,
      editableAnnotationId: (state: unknown) =>
        (state as WorkflowState).editableAnnotationId,
      isDragging: (state: unknown) => (state as WorkflowState).isDragging,
    }),
    ...mapState("selection", ["selectedAnnotations"]),
    ...mapGetters("workflow", ["isWritable"]),
    ...mapGetters("selection", [
      "isAnnotationSelected",
      "selectedNodeIds",
      "selectedConnections",
      "selectedAnnotationIds",
    ]),

    isSelected(): boolean {
      return this.isAnnotationSelected(this.annotation.id);
    },

    isEditing(): boolean {
      return this.annotation.id === this.editableAnnotationId;
    },

    showSelectionPlane(): boolean {
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

    showFocus() {
      return (
        this.$store.getters["selection/focusedObject"]?.id ===
        this.annotation.id
      );
    },

    showTransformControls(): boolean {
      if (this.isDragging || !this.isWritable) {
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

    isRichTextAnnotation(): boolean {
      return (
        this.annotation.text.contentType === TypedText.ContentTypeEnum.Html
      );
    },

    initialRichTextAnnotationValue(): string {
      return this.isRichTextAnnotation
        ? this.annotation.text.value
        : recreateLinebreaks(this.annotation.text.value);
    },

    initialBorderColor(): string {
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
      if (!this.isWritable) {
        return;
      }

      this.$store.dispatch(
        "workflow/setEditableAnnotationId",
        this.isEditing ? null : this.annotation.id,
      );
    },

    updateAnnotation() {
      return this.$store.dispatch("workflow/updateAnnotation", {
        annotationId: this.annotation.id,
        text: this.newAnnotationData.richTextContent,
        borderColor: this.newAnnotationData.borderColor,
      });
    },

    async onClickAway() {
      if (window.getSelection()?.toString() !== "" && this.isSelected) {
        return;
      }
      if (!this.isEditing) {
        return;
      }

      if (this.hasEdited) {
        await this.updateAnnotation();
      }

      this.toggleEdit();
    },

    onBlur() {
      if (this.hasEdited) {
        this.updateAnnotation();
      }
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
    :show-focus="showFocus"
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
          :annotation-bounds="transformedBounds"
          @change="onAnnotationChange"
          @change-border-color="setColor"
          @edit-start="toggleEdit"
          @blur="onBlur"
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
