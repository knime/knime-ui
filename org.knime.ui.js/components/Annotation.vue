<script>

const toHexColor = color => color.toString(0x10).padStart(7, '#000000'); // eslint-disable-line no-magic-numbers

/**
 * A workflow annotation, a rectangular box containing text.
 */
export default {
    props: {
        /**
         * @values "left", "center", "right"
         */
        textAlign: {
            type: String,
            default: 'left'
        },
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
        }
    },
    computed: {
        style() {
            const { x, y, height, width } = this.bounds;

            return {
                fontSize: `${this.defaultFontSize}px`,
                border: `${this.borderWidth}px solid ${this.borderColor}`,
                background: this.backgroundColor,
                width: `${width}px`,
                height: `${height}px`,
                left: `${x}px`,
                top: `${y}px`,
                zIndex: -1,
                textAlign: this.textAlign
            };
        }
    }
};
</script>

<template>
  <div :style="style">{{ text }}</div>
</template>

<style scoped>
div {
  position: absolute;
  padding: 15px;
  border-radius: 2px;
  line-height: 1.33;
}
</style>
