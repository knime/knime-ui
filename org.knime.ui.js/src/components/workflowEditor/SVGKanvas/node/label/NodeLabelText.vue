<!-- eslint-disable no-undefined -->
<script lang="ts">
import { type PropType, type StyleValue, defineComponent } from "vue";

import { Node, type NodeAnnotation } from "@/api/gateway-api/generated-api";
import AutoSizeForeignObject from "@/components/common/AutoSizeForeignObject.vue";
import { applyStyleRanges } from "@/util/rich-text";
import type { TextRange } from "@/util/rich-text";

export default defineComponent({
  components: { AutoSizeForeignObject },
  props: {
    value: {
      type: String,
      default: "Node label",
    },
    editable: {
      type: Boolean,
      default: false,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
    kind: {
      type: String as PropType<Node.KindEnum>,
      default: "",
    },
    nodeId: {
      type: String,
      default: "",
    },
    annotation: {
      type: Object as PropType<NodeAnnotation>,
      required: false,
      default: () => ({
        textAlign: "center",
        backgroundColor: "transparent",
        styleRanges: [],
      }),
    },
    portOffset: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  emits: ["requestEdit"],
  data() {
    return {
      textAlign: this.annotation?.textAlign,
      backgroundColor:
        this.annotation?.backgroundColor === "#FFFFFF"
          ? "transparent"
          : this.annotation?.backgroundColor,
    };
  },
  computed: {
    isMetanode() {
      return this.kind === Node.KindEnum.Metanode;
    },
    styledText() {
      const styleRanges = this.annotation ? this.annotation.styleRanges : [];
      let { textRanges, isValid } = applyStyleRanges(
        styleRanges ?? [],
        this.value,
      );

      if (!isValid) {
        consola.warn(
          `Invalid styleRanges: ${JSON.stringify(
            this.annotation.styleRanges,
          )}. Using default style.`,
        );
      }

      return textRanges;
    },
    yOffset() {
      return (
        (this.isMetanode
          ? this.$shapes.metanodeLabelOffsetY
          : this.$shapes.nodeLabelOffsetY) + this.portOffset
      );
    },
  },
  methods: {
    getTextStyles(styledTextPart: TextRange): StyleValue {
      const lineHeight = 1.1;

      return {
        fontSize: styledTextPart.fontSize
          ? `${
              styledTextPart.fontSize *
              this.$shapes.annotationsFontSizePointToPixelFactor
            }px`
          : undefined,
        color: styledTextPart.color,
        fontWeight: styledTextPart.bold ? "bold" : undefined,
        fontStyle: styledTextPart.italic ? "italic" : undefined,
        lineHeight: styledTextPart.fontSize ? lineHeight : undefined,
      };
    },
  },
});
</script>

<template>
  <AutoSizeForeignObject
    v-if="value || isSelected"
    class="node-label-text-container"
    :y-offset="yOffset"
    :parent-width="$shapes.nodeSize"
    :style="{ backgroundColor }"
  >
    <div
      class="node-label"
      :style="{ textAlign }"
      @dblclick.left="editable ? $emit('requestEdit') : null"
    >
      <span
        v-for="(part, i) in styledText"
        :key="i"
        class="text"
        :style="getTextStyles(part)"
      >
        <slot>{{ part.text }}</slot>
      </span>
      <span
        v-if="!value && editable"
        class="text placeholder"
        data-hide-in-workflow-preview
      >
        <slot>Add comment</slot>
      </span>
    </div>
  </AutoSizeForeignObject>
</template>

<style lang="postcss" scoped>
.node-label-text-container {
  font-family: "Roboto Condensed", sans-serif;
  cursor: default;
  user-select: none;

  &:hover {
    cursor: pointer;
    outline: 1px solid var(--knime-silver-sand);
  }

  & .node-label {
    padding: calc(v-bind("$shapes.nodeNamePadding") * 1px);
    line-height: calc(v-bind("$shapes.nodeNameLineHeight") * 1px);
  }

  & .text {
    font-family: "Roboto Condensed", sans-serif;
    font-style: normal;
    font-size: calc(v-bind("$shapes.nodeNameFontSize") * 1px);
    white-space: pre;
  }

  & .text.placeholder {
    color: var(--knime-dove-gray);
    font-style: italic;
  }
}
</style>
