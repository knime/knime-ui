<script>
import LegacyAnnotationText from '~/components/workflow/LegacyAnnotationText';
import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject';
/**
 * A node annotation, a rectangular box containing text.
 */
export default {
    components: {
        AutoSizeForeignObject,
        LegacyAnnotationText
    },
    inheritAttrs: false,
    props: {
        /**
         * @values "left", "center", "right"
         */
        textAlign: {
            type: String,
            default: 'center',
            validator: val => ['left', 'center', 'right'].includes(val)
        },
        /**
         * Font size (in knime points) that should be applied to unstyled text
         */
        defaultFontSize: {
            type: Number,
            default: 11
        },
        backgroundColor: {
            type: String,
            default: null
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
        },
        /**
         * Optional y-offset relative to the default position.
         */
        yOffset: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            resizeKey: '0'
        };
    },
    computed: {
        textStyle() {
            return {
                textAlign: this.textAlign,
                backgroundColor: this.backgroundColor === '#FFFFFF' ? 'transparent' : this.backgroundColor,
                padding: `${this.$shapes.nodeAnnotationPadding}px`,
                fontSize: `${this.defaultFontSize * this.$shapes.annotationsFontSizePointToPixelFactor}px`
            };
        }
    },
    watch: {
        textAlign() { this.updateResizeKey(); },
        defaultFontSize() { this.updateResizeKey(); },
        text() { this.updateResizeKey(); },
        styleRanges() { this.updateResizeKey(); }
    },
    methods: {
        updateResizeKey() {
            this.resizeKey = `${Number(this.resizeKey) + 1}`;
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    ref="container"
    class="container"
    :resize-key="resizeKey"
    :y-offset="$shapes.nodeSize + $shapes.nodeAnnotationMarginTop + yOffset"
    :parent-width="$shapes.nodeSize"
    :max-width="$shapes.maxNodeAnnotationWidth"
  >
    <LegacyAnnotationText
      ref="text"
      class="text"
      :style="textStyle"
      :text="text"
      :style-ranges="styleRanges"
    />
  </AutoSizeForeignObject>
</template>

<style lang="postcss" scoped>
.container {
  font-family: "Roboto Condensed", sans-serif;
  cursor: default;
  user-select: none;

  &:hover {
    outline: 1px solid var(--knime-silver-sand);
  }

  & .text {
    text-align: center;
  }
}
</style>
