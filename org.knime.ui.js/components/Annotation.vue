<script>
export default {
    props: {
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
            default: 16766976 // knime-yellow
        },
        backgroundColor: {
            type: Number,
            default: 16777215 // white
        },
        bounds: {
            type: Object,
            required: true,
            validator: ({ x, y, height, width }) => x && y && height && width
        },
        text: {
            type: String,
            default: ''
        }
    },
    computed: {
        borderColorHex() {
            return `#${this.borderColor.toString(16).padStart(6, '0')}`; // eslint-disable-line no-magic-numbers
        },
        backgroundColorHex() {
            return `#${this.backgroundColor.toString(16).padStart(6, '0')}`; // eslint-disable-line no-magic-numbers
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
