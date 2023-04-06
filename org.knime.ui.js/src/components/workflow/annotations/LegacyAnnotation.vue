<script lang="ts">
import { defineComponent, type PropType, type StyleValue } from 'vue';
import { applyStyleRanges } from '@/util/styleRanges';
import type { WorkflowAnnotation } from '@/api/gateway-api/generated-api';

export default defineComponent({
    props: {
        annotation: {
            type: Object as PropType<WorkflowAnnotation>,
            required: true
        }
    },
    emits: ['editStart'],
    computed: {
        styledText() {
            const { styleRanges, text } = this.annotation;
            const { textRanges, isValid } = applyStyleRanges(styleRanges, text);
            if (!isValid) {
                consola.warn(`Invalid styleRanges: ${JSON.stringify(styleRanges)}. Using default style.`);
            }
            return textRanges;
        },

        annotationWrapperStyle(): StyleValue {
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
        }
    }
});
</script>

<template>
  <div
    :style="annotationWrapperStyle"
    @dblclick="$emit('editStart')"
  >
    <span
      v-for="(part, i) in styledText"
      :key="`text-${i}`"
      :style="{
        fontSize: part.fontSize ? `${part.fontSize * $shapes.annotationsFontSizePointToPixelFactor}px` : null,
        color: part.color,
        fontWeight: part.bold ? 'bold': null,
        fontStyle: part.italic ? 'italic' : null
      }"
    >{{ part.text }}</span>
  </div>
</template>

<style lang="postcss" scoped>
div {
  overflow: hidden;
  line-height: 1.1;
}

span {
  white-space: pre-wrap;
}
</style>
