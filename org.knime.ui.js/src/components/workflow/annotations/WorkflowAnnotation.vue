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
        },

        isEditing: {
            type: Boolean,
            default: false
        }
    },

    emits: ['toggleEdit'],

    expose: ['setSelectionPreview'],

    data() {
        return {
            selectionPreview: null,
            hasEdited: false,
            richTextContent: ''
        };
    },

    computed: {
        ...mapState('workflow', {
            projectId: state => state.activeWorkflow.projectId,
            activeWorkflowId: state => state.activeWorkflow.info.containerId
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

        showSelectionPlane() {
            if (this.selectionPreview === null) {
                return this.isSelected;
            }

            if (this.isSelected && this.selectionPreview === 'hide') {
                return false;
            }

            return this.selectionPreview === 'show' || this.isSelected;
        },

        showTransformControls() {
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
        }
    },

    methods: {
        ...mapActions('selection', ['selectAnnotation', 'deselectAnnotation', 'deselectAllObjects']),
        ...mapActions('application', ['toggleContextMenu']),

        onLeftClick(event: MouseEvent) {
            const metaOrCtrlKey = getMetaOrCtrlKey();
            const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

            const action = isMultiselect && this.isSelected
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
            this.$emit('toggleEdit', this.isEditing ? null : this.annotation.id);
        },

        onClickAway() {
            if (!this.isEditing) {
                return;
            }

            if (this.hasEdited) {
                this.$store.dispatch('workflow/updateAnnotationText', {
                    annotationId: this.annotation.id,
                    text: this.richTextContent
                });
            }

            this.toggleEdit();
        },

        onAnnotationChange(content: string) {
            if (!this.hasEdited) {
                this.hasEdited = true;
            }

            this.richTextContent = content;
        },

        getAnnotationToolbarContainerBounds(transformedBounds: Bounds): Bounds {
            const x =
                // start from same X as annotation
                transformedBounds.x -
                // center by substracting half the toolbar width + half the annotation width
                this.$shapes.annotationToolbarContainerWidth / 2 +
                transformedBounds.width / 2;

            // use same Y as annoation and add a negative Y offset equal to the toolbar height
            const y = transformedBounds.y - this.$shapes.annotationToolbarContainerHeight;

            return {
                x,
                y,
                width: this.$shapes.annotationToolbarContainerWidth,
                height: this.$shapes.annotationToolbarContainerHeight
            };
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
        v-bind="getAnnotationToolbarContainerBounds(transformedBounds)"
        :class="{ hidden: !isEditing }"
        @pointerdown.stop
        @pointerup.stop
      >
        <PortalTarget
          :name="`editor-toolbar-${annotation.id}`"
          tag="div"
          class="toolbar-portal"
        />
      </foreignObject>

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
          :editable="isEditing"
          @change="onAnnotationChange"
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

.hidden {
    opacity: 0;
    pointer-events: none;
}

.toolbar-portal {
    height: 100%;
}
</style>
