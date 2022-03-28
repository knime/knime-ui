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
         * Font size that should be applied to unstyled text
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
        yShift: {
            type: Number,
            default: 0
        }
    },
    computed: {
        textStyle() {
            return {
                textAlign: this.textAlign,
                backgroundColor: this.backgroundColor === '#FFFFFF' ? 'transparent' : this.backgroundColor,
                padding: `${this.$shapes.nodeAnnotationPadding}px`,
                fontSize: `${this.defaultFontSize}px`
            };
        }
    },
    watch: {
        textAlign() { this.adjustDimensions(); },
        defaultFontSize() { this.adjustDimensions(); },
        text() { this.adjustDimensions(); },
        styleRanges() { this.adjustDimensions(); }
    },
    mounted() {
        this.adjustDimensions();
    },
    methods: {
        adjustDimensions() {
            this.$refs.container?.adjustDimensions();
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    ref="container"
    class="container"
    :y-shift="$shapes.nodeSize + $shapes.nodeAnnotationMarginTop + yShift"
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
