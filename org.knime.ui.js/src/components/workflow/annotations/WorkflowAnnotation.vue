<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState, mapActions, mapGetters } from 'vuex';
import { mixin as VueClickAway } from 'vue3-click-away';

import type { Bounds, WorkflowAnnotation } from '@/api/gateway-api/generated-api';
import { Annotation } from '@/api/gateway-api/generated-api';

import { getMetaOrCtrlKey } from '@/util/navigator';
import TransformControls from './TransformControls.vue';
import LegacyAnnotation from './LegacyAnnotation.vue';
import RichTextEditor from './RichTextEditor.vue';

/**
 * A workflow annotation, a rectangular box containing text.
 */
export default defineComponent({
    components: {
        LegacyAnnotation,
        RichTextEditor,
        TransformControls
    },
    mixins: [VueClickAway],
    inheritAttrs: false,

    props: {
        annotation: {
            type: Object as PropType<WorkflowAnnotation>,
            required: true
        }
    },

    emits: ['toggleEdit'],

    expose: ['setSelectionPreview'],

    data() {
        return {
            selectionPreview: null,
            hasEdited: false,
            richTextContent: '',
            hasChangedBorderColor: false,
            borderColor: null
        };
    },

    computed: {
        ...mapState('workflow', {
            projectId: state => state.activeWorkflow.projectId,
            activeWorkflowId: state => state.activeWorkflow.info.containerId,
            editableAnnotationId: state => state.editableAnnotationId,
            isDragging: state => state.isDragging
        }),
        ...mapState('selection', ['selectedAnnotations']),
        ...mapGetters('selection', [
            'isAnnotationSelected',
            'selectedNodeIds',
            'selectedConnections',
            'selectedAnnotationIds'
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

            if (this.isSelected && this.selectionPreview === 'hide') {
                return false;
            }

            return this.selectionPreview === 'show' || this.isSelected;
        },

        showTransformControls() {
            if (this.isDragging) {
                return false;
            }

            const isMoreThanOneAnnotationSelected = this.selectedAnnotationIds.length > 1;
            const isOneOrMoreNodesSelected = this.selectedNodeIds.length >= 1;
            const isOneOrMoreConnectionsSelected = this.selectedConnections.length >= 1;
            let isMoreThanOneItemSelected =
            isMoreThanOneAnnotationSelected || isOneOrMoreNodesSelected || isOneOrMoreConnectionsSelected;

            return this.isSelected && !isMoreThanOneItemSelected && this.showSelectionPlane;
        },

        isRichTextAnnotation() {
            return this.annotation.contentType === Annotation.ContentTypeEnum.Html;
        },

        initialRichTextAnnotationValue() {
            if (this.isRichTextAnnotation) {
                return this.annotation.text;
            }

            const recreateLinebreaks = (content: string) => content.replaceAll('\r\n', '<br />');

            return recreateLinebreaks(this.annotation.text);
        },

        activeBorderColor() {
            if (this.hasChangedBorderColor) {
                return this.borderColor;
            }

            const isEditingLegacyAnnotation = !this.isRichTextAnnotation && this.isEditing;

            return isEditingLegacyAnnotation
                ? this.$colors.defaultAnnotationBorderColor
                : this.annotation.borderColor;
        }
    },

    methods: {
        ...mapActions('selection', ['selectAnnotation', 'deselectAnnotation', 'deselectAllObjects']),
        ...mapActions('application', ['toggleContextMenu']),

        async onLeftClick(event: MouseEvent) {
            const metaOrCtrlKey = getMetaOrCtrlKey();
            const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

            if (!isMultiselect) {
                await this.deselectAllObjects();
                await this.selectAnnotation(this.annotation.id);
                return;
            }

            const action = this.isSelected
                ? this.deselectAnnotation
                : this.selectAnnotation;

            action(this.annotation.id);
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
            this.$store.dispatch('workflow/transformWorkflowAnnotation', {
                bounds,
                annotationId: this.annotation.id
            });
        },

        toggleEdit() {
            this.$store.dispatch('workflow/setEditableAnnotationId', this.isEditing ? null : this.annotation.id);
        },

        onClickAway() {
            if (!this.isEditing) {
                return;
            }

            if (this.hasEdited || this.hasChangedBorderColor) {
                this.$store.dispatch('workflow/updateAnnotation', {
                    annotationId: this.annotation.id,
                    text: this.hasEdited ? this.richTextContent : this.annotation.text,
                    borderColor: this.hasChangedBorderColor ? this.borderColor : this.annotation.borderColor
                });
            }

            this.toggleEdit();
        },

        onAnnotationChange(content: string) {
            this.hasEdited = true;
            this.richTextContent = content;

            // for a first-time edit of a legacy annotation
            if (!this.isRichTextAnnotation) {
                // we also say that the border changed, so that the new default color gets sent on the request
                this.setColor(this.$colors.defaultAnnotationBorderColor);
            }
        },

        setColor(color: string) {
            this.hasChangedBorderColor = true;
            this.borderColor = color;
        }
    }
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

        <RichTextEditor
          v-if="isRichTextAnnotation || isEditing"
          :id="annotation.id"
          :initial-value="initialRichTextAnnotationValue"
          :border-color="activeBorderColor"
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
