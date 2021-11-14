<script>
import LegacyAnnotationText from '~/components/workflow/LegacyAnnotationText';
import { mapState } from 'vuex';
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
    data() {
        return {
            width: this.$shapes.maxNodeAnnotationWidth,
            height: 0,
            x: 0
        };
    },
    computed: {
        ...mapState('canvas', ['zoomFactor']),
        textStyle() {
            return {
                textAlign: this.textAlign,
                backgroundColor: this.backgroundColor === '#FFFFFF' ? 'transparent' : this.backgroundColor,
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
        // foreignObject requires `width` and `height` attributes, or the content is cut off.
        // So we need to 1. render, 2. measure, 3. update
        adjustDimensions() {
            // 1. render with max width
            this.width = this.$shapes.maxNodeAnnotationWidth;
            this.$nextTick(() => { // wait for re-render
                // 2. measure content's actual size
                let rect = this.$refs.text?.$el.getBoundingClientRect();
                if (!rect) {
                    consola.error('Tried to adjust dimensions of NodeAnnotation, but DOM element is gone');
                    return;
                }
                // account for zoom
                let width = Math.ceil(rect.width / this.zoomFactor);
                let height = Math.ceil(rect.height / this.zoomFactor);
                
                // 3. set container size to content size
                this.width = width;
                this.height = height;
                
                // center container
                this.x = (this.$shapes.nodeSize - this.width) / 2;
            });
        }
    }
};
</script>

<template>
  <foreignObject
    class="container"
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

<style lang="postcss" scoped>
.container {
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
