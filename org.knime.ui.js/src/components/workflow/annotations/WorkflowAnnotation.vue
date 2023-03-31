<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState, mapActions, mapGetters } from 'vuex';

import type { Bounds, WorkflowAnnotation } from '@/api/gateway-api/generated-api';

import { getMetaOrCtrlKey } from '@/util/navigator';
import TransformControls from './TransformControls.vue';
import LegacyAnnotationText from './LegacyAnnotationText.vue';

/**
 * A workflow annotation, a rectangular box containing text.
 */
export default defineComponent({
    components: {
        LegacyAnnotationText,
        TransformControls
    },
    inheritAttrs: false,

    props: {
        annotation: {
            type: Object as PropType<WorkflowAnnotation>,
            required: true
        }
    },

    data() {
        return {
            selectionPreview: null
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
        annotationWrapperStyle() {
            const {
                backgroundColor,
                borderColor,
                // eslint-disable-next-line no-magic-numbers
                defaultFontSize = 12,
                borderWidth = 2,
                textAlign = 'left'
            } = this.annotation;

            return {
                fontSize: `${defaultFontSize * this.$shapes.annotationsFontSizePointToPixelFactor}px`,
                border: `${borderWidth}px solid ${borderColor}`,
                background: backgroundColor,
                textAlign,
                padding: `${this.$shapes.workflowAnnotationPadding}px`,
                width: '100%',
                height: '100%'
            };
        },
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

            return this.isSelected && !isMoreThanOneItemSelected;
        }
    },
    methods: {
        ...mapActions('selection', ['selectAnnotation', 'deselectAnnotation', 'deselectAllObjects']),
        ...mapActions('application', ['toggleContextMenu']),
        onLeftClick(event: PointerEvent) {
            const metaOrCtrlKey = getMetaOrCtrlKey();

            if (event.shiftKey || event[metaOrCtrlKey]) {
                // Multi select
                if (this.isSelected) {
                    this.deselectAnnotation(this.annotation.id);
                } else {
                    this.selectAnnotation(this.annotation.id);
                }
            } else {
                // Single select
                this.deselectAllObjects();
                this.selectAnnotation(this.annotation.id);
            }
        },
        onContextMenu(event: PointerEvent) {
            const metaOrCtrlKey = getMetaOrCtrlKey();

            if (event.shiftKey || event[metaOrCtrlKey]) {
            // Multi select
                this.selectAnnotation(this.annotation.id);
            } else if (!this.isSelected) {
            // single select
                this.deselectAllObjects();
                this.selectAnnotation(this.annotation.id);
            }

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
        }
    }
});

</script>

<template>
  <TransformControls
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
        <LegacyAnnotationText
          :text="annotation.text"
          :style="annotationWrapperStyle"
          :style-ranges="annotation.styleRanges"
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
