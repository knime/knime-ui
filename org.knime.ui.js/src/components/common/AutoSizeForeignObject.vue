<script>
/**
 * A <foreignObject> that can be used in SVG to render HTML. It automatically updates the size based on the contents.
 * Updates to the contents can be done via `adjustDimensions` method.
 * It offers limits to the size and always centers around a given parentWidth. It issues 'width' and 'height' events
 * when the size is adjusted so other drawings can update.
 */
export default {
    props: {
        /**
         * content that will be rendered in the wrapper
         */
        value: {
            type: String,
            default: ''
        },
        /**
         * Max width of the element.
         */
        maxWidth: {
            type: Number,
            default: 1000
        },
        /**
         * Optional y-offset relative to the default position.
         */
        yOffset: {
            type: Number,
            default: 0
        },
        /**
         * Optional The element is moved on y-axis by the mesaured height (in addition to yOffset).
         */
        offsetByHeight: {
            type: Boolean,
            default: false
        },
        /**
         * Optional the width of the (visual) parent to center around.
         */
        parentWidth: {
            type: Number,
            default: null
        }
    },

    emits: ['widthChange', 'heightChange'],

    data() {
        return {
            width: this.maxWidth,
            // A height of at least 1px is required for Firefox
            // so that the wrapper's bounding rect is calculated correctly
            height: 1,
            x: 0
        };
    },

    computed: {
        y() {
            if (this.offsetByHeight) {
                return -this.height + this.yOffset;
            }
            return this.yOffset;
        }
    },

    watch: {
        value() {
            this.width = this.maxWidth;
        }
    },

    async mounted() {
        this.centerAroundParentWidth();
        await this.$nextTick();

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { contentRect } = entry;
                this.width = contentRect.width;
                this.height = contentRect.height;

                this.centerAroundParentWidth();
                this.emitDimensions();
            }
        });

        resizeObserver.observe(this.$refs.wrapper);

        this.resizeObserver = resizeObserver;
    },

    beforeUnmount() {
        this.resizeObserver?.disconnect();
    },

    methods: {
        centerAroundParentWidth() {
            if (this.parentWidth !== null) {
                this.x = (this.parentWidth - this.width) / 2;
            }
        },

        emitDimensions() {
            this.$emit('widthChange', this.width);
            this.$emit('heightChange', this.height);
        }
    }
};
</script>

<template>
  <foreignObject
    class="autosize-container"
    :width="width"
    :height="height"
    :x="x"
    :y="y"
  >
    <!-- wrapper is used to calculate size -->
    <div
      ref="wrapper"
      class="wrapper"
    >
      <slot />
    </div>
  </foreignObject>
</template>

<style lang="postcss" scoped>
.autosize-container {
  & .wrapper {
    display: block;
    padding: 0;
    margin: auto;
    border: 0;

    /* solves many problems with inline-blocks such as whitespace; https://caniuse.com/intrinsic-width */
    /* stylelint-disable-next-line value-no-vendor-prefix */
    width: -moz-fit-content;
    width: fit-content;
  }
}
</style>
