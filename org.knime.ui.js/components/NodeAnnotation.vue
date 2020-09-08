<script>
import LegacyAnnotationText from '~/components/LegacyAnnotationText';

/**
 * A node annotation, a rectangular box containing text.
 */
export default {
    components: {
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
    data() {
        return {
            width: this.$shapes.maxNodeAnnotationWidth,
            height: 0,
            x: 0
        };
    },
    computed: {
        textStyle() {
            return {
                textAlign: this.textAlign,
                padding: `${this.$shapes.nodeAnnotationPadding}px`,
                fontSize: `${this.defaultFontSize}px`
            };
        },
        y() {
            let result = this.$shapes.nodeSize + this.$shapes.nodeAnnotationMarginTop;
            if (this.yShift) {
                result += this.yShift;
            }
            return result;
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
            this.with = this.$shapes.maxNodeAnnotationWidth;
            this.$nextTick(() => { // wait for re-render
                let rect = this.$refs.text.$el.getBoundingClientRect();
                let width = Math.ceil(rect.width);
                this.width = width;
                this.x = (this.$shapes.nodeSize - width) / 2;
                this.height = Math.ceil(rect.height);
            });
        }
    }
};
</script>

<template>
  <foreignObject
    :width="width"
    :height="height"
    :x="x"
    :y="y"
  >
    <LegacyAnnotationText
      ref="text"
      class="text"
      :style="textStyle"
      :text="text"
      :style-ranges="styleRanges"
    />
  </foreignObject>
</template>

<style scoped>
foreignObject {
  font-family: "Roboto Condensed", sans-serif;
  cursor: default;
  user-select: none;

  &:hover {
    outline: 1px solid var(--knime-silver-sand);
  }

  & .text {
    display: inline-block;
    text-align: center;
  }
}
</style>
