<script>

const toHexColor = color => color.toString(0x10).padStart(7, '#000000'); // eslint-disable-line no-magic-numbers

/**
 * A workflow annotation, a rectangular box containing text.
 */
export default {
    props: {
        /**
         * @values "LEFT", "CENTER", "RIGHT"
         */
        textAlignment: {
            type: String,
            default: 'LEFT'
        },
        defaultFontSize: {
            type: Number,
            default: 12
        },
        borderSize: {
            type: Number,
            default: 2
        },
        borderColor: {
            type: Number,
            default: 0xffd800 // knime-yellow
        },
        backgroundColor: {
            type: Number,
            default: 0xffffff // white
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
        borderColorHex() {
            return toHexColor(this.borderColor);
        },
        backgroundColorHex() {
            return toHexColor(this.backgroundColor);
        },

        style() {
            const { x, y, height, width } = this.bounds;

            return {
                fontSize: `${this.defaultFontSize}px`,
                border: `${this.borderSize}px solid ${this.borderColorHex}`,
                background: this.backgroundColorHex,
                width: `${width}px`,
                height: `${height}px`,
                left: `${x}px`,
                top: `${y}px`,
                zIndex: -1,
                textAlign: this.textAlignment.toLowerCase()
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
