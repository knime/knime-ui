<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState } from 'vuex';
import { mixin as VueClickAway } from 'vue3-click-away';

import type { Bounds, WorkflowAnnotation } from '@/api/gateway-api/generated-api';
import { API } from '@api';

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
    mixins: [VueClickAway],
    inheritAttrs: false,

    props: {
        annotation: {
            type: Object as PropType<WorkflowAnnotation>,
            required: true,
        }
    },

    data() {
        return {
            isSelected: false,
            isEditing: false
        };
    },

    computed: {
        ...mapState('workflow', {
            projectId: state => state.activeWorkflow.projectId,
            activeWorkflowId: state => state.activeWorkflow.info.containerId
        }),
        annotationWrapperStyle() {
            const {
                backgroundColor,
                borderColor,
                defaultFontSize = 12,
                borderWidth = 2,
                textAlign = 'left'
            } = this.annotation;

            return {
                fontSize: `${defaultFontSize * this.$shapes.annotationsFontSizePointToPixelFactor}px`,
                border: `${borderWidth}px solid ${borderColor}`,
                background: backgroundColor,
                textAlign: textAlign,
                padding: `${this.$shapes.workflowAnnotationPadding}px`,
                width: '100%',
                height: '100%'
            };
        }
    },

    methods: {
        toggleEdit() {
            // this.$emit('toggle-edit', this.editable ? null : this.id);
        },

        unselect() {
            this.isEditing = false;
            this.isSelected = false;
        },

        moveAnnotation(newBounds: Bounds) {
            API.workflowCommand.ResizeWorkflowAnnotation({
                projectId: this.projectId,
                workflowId: this.projectId,
                id: this.annotation.id,
                ...newBounds
            });
        }
    }
});
</script>

<template>
  <TransformControls
    v-click-away="() => unselect()"
    :disabled="!isEditing"
    :initial-value="annotation.bounds"
    @transform-end="moveAnnotation($event.newBounds)"
  >
    <template #default="{ transformedBounds }">
      <foreignObject
        :x="transformedBounds.x"
        :y="transformedBounds.y"
        :width="transformedBounds.width"
        :height="transformedBounds.height"
        :class="['annotation-foreign-object', { selected: isSelected }]"
        @click="isSelected = true"
        @dblclick="isSelected ? (isEditing = true) : null"
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
  cursor: default;
  user-select: none;
}

.annotation-foreign-object.selected {
    outline: 1px solid var(--knime-masala);
}
</style>
