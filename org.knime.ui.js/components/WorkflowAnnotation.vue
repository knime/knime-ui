<script>
import LegacyAnnotationText from '~/components/LegacyAnnotationText';

/**
 * A workflow annotation, a rectangular box containing text.
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
            default: 'left',
            validator: val => ['left', 'center', 'right'].includes(val)
        },
        /**
         * Font size that should be applied to unstyled text
         */
        defaultFontSize: {
            type: Number,
            default: 11
        },
        borderWidth: {
            type: Number,
            default: 2
        },
        borderColor: {
            type: String,
            default: '#ffd800' // knime-yellow
        },
        backgroundColor: {
            type: String,
            default: '#fff' // white
        },
        bounds: {
            type: Object,
            required: true,
            validator: ({ x, y, height, width }) => typeof x === 'number' && typeof y === 'number' &&
                typeof height === 'number' && typeof width === 'number'
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
    computed: {
        style() {
            const { height, width } = this.bounds;

            return {
                fontSize: `${this.defaultFontSize}px`,
                border: `${this.borderWidth}px solid ${this.borderColor}`,
                background: this.backgroundColor,
                width: `${width - 2 * (this.borderWidth + this.$shapes.workflowAnnotationPadding)}px`,
                height: `${height - 2 * (this.borderWidth + this.$shapes.workflowAnnotationPadding)}px`,
                textAlign: this.textAlign,
                padding: `${this.$shapes.workflowAnnotationPadding}px`
            };
        }
    }
};
</script>

<template>
  <foreignObject
    :x="bounds.x"
    :y="bounds.y"
    :width="bounds.width"
    :height="bounds.height"
  >
    <LegacyAnnotationText
      :style="style"
      :text="text"
      :style-ranges="styleRanges"
    />
  </foreignObject>
</template>

<style scoped>
div {
  border-radius: 2px;
  cursor: default;
  user-select: none;
}
</style>
