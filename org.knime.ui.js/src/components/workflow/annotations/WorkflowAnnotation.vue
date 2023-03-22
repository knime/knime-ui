<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState, mapActions, mapGetters } from 'vuex';
import { mixin as VueClickAway } from 'vue3-click-away';

import type { Bounds, WorkflowAnnotation } from '@/api/gateway-api/generated-api';
import { API } from '@api';

import { getMetaOrCtrlKey } from '@/util/navigator';
import TransformControls from './TransformControls.vue';
import LegacyAnnotationText from './LegacyAnnotationText.vue';
/**
 * A workflow annotation, a rectangular box containing text.
 */
export default defineComponent({ components: {
    LegacyAnnotationText,
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

data() {
    return {
        isEditing: false,
        selectionPreview: null
    };
},

computed: {
    ...mapState('workflow', {
        projectId: state => state.activeWorkflow.projectId,
        activeWorkflowId: state => state.activeWorkflow.info.containerId
    }),
    ...mapState('selection', ['selectedAnnotations']),
    ...mapGetters('selection', ['isAnnotationSelected']),
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
    }
},
methods: {
    ...mapActions('selection', ['selectAnnotation', 'deselectAnnotation', 'deselectAllObjects']),
    ...mapActions('application', ['toggleContextMenu']),
    onLeftClick() {
        this.isEditing = true;
        return this.isSelected
            ? this.deselectAnnotation(this.annotation.id)
            : this.selectAnnotation(this.annotation.id);
            
        // console.log(this.isAnnotationSelected(annotationId));
        // this.selectAnnotation(annotationId);
        // this.isSelected = true;
    },
    onContextMenu(event) {
        const metaOrCtrlKey = getMetaOrCtrlKey();

        if (event.shiftKey || metaOrCtrlKey) {
            // Multi select
            this.selectAnnotation(this.id);
        } else if (!this.isSelected) {
            // single select
            this.deselectAllObjects();
            this.selectAnnotation(this.id);
        }

        this.toggleContextMenu({ event });
        // this.$store.dispatch('application/toggleContextMenu', { event });
    },
    setSelectionPreview(type) {
        this.selectionPreview = type;
    },
    unselect() {
        this.isEditing = false;
        this.isSelected = false;
    },

    moveAnnotation(bounds: Bounds) {
        // rect outside foreignObject
    //     fill="transparent"
    //     :stroke="$colors.selection.activeBorder"
    //   :stroke-width="$shapes.selectedAnnotationStrokeWidth"
    //   :rx="$shapes.selectedItemBorderRadius"
        API.workflowCommand.TransformWorkflowAnnotation({
            projectId: this.projectId,
            workflowId: this.activeWorkflowId,
            id: this.annotation.id,
            bounds
        });
    }
} });

</script>

<template>
  <TransformControls
    v-if="showSelectionPlane"
    v-click-away="() => unselect()"
    :disabled="!isEditing"
    :initial-value="annotation.bounds"
    @transform-end="moveAnnotation($event.bounds)"
  >
    <template #default="{ transformedBounds }">
      <foreignObject
        :x="transformedBounds.x"
        :y="transformedBounds.y"
        :width="transformedBounds.width"
        :height="transformedBounds.height"
        :class="['annotation-foreign-object', { selected: isSelected }]"
        @click="onLeftClick"
        @dblclick="isSelected ? (isEditing = true) : null"
        @pointerdown.right.stop="onContextMenu"
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

.annotation-foreign-object.selected {
    outline: 1px solid var(--knime-cornflower);
}
</style>
