<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapGetters } from 'vuex';
import { mixin as VueClickAway } from 'vue3-click-away';

import type { Bounds } from '@/api/gateway-api/generated-api';

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
        /**
         * @values "left", "center", "right"
         */
        textAlign: {
            type: String,
            default: 'left',
            validator: (value: string) => ['left', 'center', 'right'].includes(value)
        },
        /**
         * Font size (in pt) that should be applied to un-styled text
         */
        defaultFontSize: {
            type: Number,
            default: 12
        },
        borderWidth: {
            type: Number,
            default: 2
        },
        borderColor: {
            type: String,
            required: true
        },
        backgroundColor: {
            type: String,
            required: true
        },
        bounds: {
            type: Object as PropType<Required<Bounds>>,
            required: true,
            validator: ({ x, y, height, width }) => typeof x === 'number' &&
                typeof y === 'number' &&
                typeof height === 'number' &&
                typeof width === 'number'

        },
        text: {
            type: String,
            default: ''
        },
        /**
         * passed through to `LegacyAnnotationText`
         */
        styleRanges: {
            type: Array,
            default: () => []
        }
    },
    data() {
        return {
            isSelected: false,
            isEditing: false,
            isHovering: false,
            isTransforming: false
        };
    },
    computed: {
        ...mapGetters('canvas', ['viewBox', 'screenToCanvasCoordinates']),

        annotationWrapperStyle() {
            return {
                fontSize: `${this.defaultFontSize * this.$shapes.annotationsFontSizePointToPixelFactor}px`,
                border: `${this.borderWidth}px solid ${this.borderColor}`,
                background: this.backgroundColor,
                textAlign: this.textAlign,
                padding: `${this.$shapes.workflowAnnotationPadding}px`,
                width: '100%',
                height: '100%'
            };
        }
    },

    methods: {
        toggleEdit() {
            this.isTransforming = true;
            // this.$emit('toggle-edit', this.editable ? null : this.id);
        },

        unselect() {
            this.isEditing = false;
            this.isSelected = false;
        }
    }
});
</script>

<template>
  <TransformControls
    v-click-away="() => unselect()"
    :disabled="!isEditing"
    :initial-value="bounds"
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
          :text="text"
          :style="annotationWrapperStyle"
          :style-ranges="styleRanges"
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
