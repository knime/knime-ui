<script lang="ts">
import { type PropType, type StyleValue, defineComponent } from "vue";

import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import { applyStyleRanges } from "@/util/rich-text";

export default defineComponent({
  props: {
    annotation: {
      type: Object as PropType<WorkflowAnnotation>,
      required: true,
    },
  },
  emits: ["editStart"],
  computed: {
    styledText() {
      const { styleRanges = [], text } = this.annotation;
      const { textRanges, isValid } = applyStyleRanges(
        styleRanges,
        text.value || "",
      );

      if (!isValid) {
        consola.warn(
          `Invalid styleRanges: ${JSON.stringify(
            styleRanges,
          )}. Using default style.`,
        );
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
        textAlign = "left",
      } = this.annotation;

      return {
        fontSize: `${
          defaultFontSize * this.$shapes.annotationsFontSizePointToPixelFactor
        }px`,
        border: `${borderWidth}px solid ${borderColor}`,
        background: backgroundColor,
        textAlign,
        padding: `${this.$shapes.workflowAnnotationPadding}px`,
        width: "100%",
        height: "100%",
      };
    },
  },

  methods: {
    getFontSize(part: any) {
      return part.fontSize
        ? `${
            part.fontSize * this.$shapes.annotationsFontSizePointToPixelFactor
          }px`
        : // eslint-disable-next-line no-undefined
          undefined;
    },
  },
});
</script>

<template>
  <div
    :style="annotationWrapperStyle"
    aria-label="Edit annotation"
    @dblclick="$emit('editStart')"
  >
    <span
      v-for="(part, i) in styledText"
      :key="`text-${i}`"
      :style="{
        fontSize: getFontSize(part),
        color: part.color,
        fontWeight: part.bold ? 'bold' : undefined,
        fontStyle: part.italic ? 'italic' : undefined,
      }"
      >{{ part.text }}</span
    >
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
