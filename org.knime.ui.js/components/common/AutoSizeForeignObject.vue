<script>
import { mapState } from 'vuex';
const IGNORE_SIZE_CHANGE_SMALLER_THEN = 1; // pixel

/**
 * A <foreignObject> that can be used in SVG to render HTML. It automatically updates the size based on the contents.
 * Updates to the contents can be provided via the value prop. It the value changes size is updated.
 * It offers limits to the size and always centers around a given parentWidth. It issues 'width' and 'height' events
 * when the size is adjusted so other drawings can update.
 */
export default {
    props: {
        maxWidth: {
            type: Number,
            default: 1000
        },
        /**
         * Optional y-offset relative to the default position.
         */
        yShift: {
            type: Number,
            default: 0
        },
        shiftByHeight: {
            type: Boolean,
            default: false
        },
        /**
         * Optional the width of the (visual) parent to center around
         */
        parentWidth: {
            type: Number,
            default: null
        },
        /**
         * Optional hook that is called before the dimension is adjusted.
         */
        adjustDimensionBeforeHook: {
            type: Function,
            default: null
        }
    },
    data() {
        return {
            width: this.maxWidth,
            height: 0,
            x: 0
        };
    },
    computed: {
        ...mapState('canvas', ['zoomFactor']),
        y() {
            if (this.shiftByHeight) {
                return -this.height + this.yShift;
            }
            return this.yShift;
        }
    },
    mounted() {
        this.adjustDimensions();
    },
    methods: {
        // foreignObject requires `width` and `height` attributes, or the content is cut off.
        // So we need to 1. render, 2. measure, 3. update
        async adjustDimensions({ startWidth, startHeight } = {}) {
            // start values (useful if this component replaces another one with the given size to avoid jumping)
            if (startWidth) {
                this.width = startWidth;
            }
            if (startHeight) {
                this.height = startHeight;
            }
            if (this.adjustDimensionBeforeHook) {
                // this is required for FF
                await this.$nextTick(() => {
                    this.adjustDimensionBeforeHook();
                });
            }
            const lastWidth = this.width;
            // 1. render with max width or given startWidth
            this.width = this.maxWidth;
            this.$nextTick(() => { // wait for re-render
                // 2. measure content's actual size
                let rect = this.$refs.wrapper?.getBoundingClientRect();
                if (!rect) {
                    consola.error('Tried to adjust dimensions of NodeTitle, but element is gone or is not a DOM Node');
                    return;
                }
                // account for zoom
                let width = Math.ceil(rect.width / this.zoomFactor);
                let height = Math.ceil(rect.height / this.zoomFactor);

                // 3. set container size to content size
                // avoid width jitter
                if (Math.abs(lastWidth - width) > IGNORE_SIZE_CHANGE_SMALLER_THEN) {
                    this.width = width;
                } else {
                    this.width = lastWidth;
                }
                // avoid height jitter
                if (Math.abs(this.height - height) > IGNORE_SIZE_CHANGE_SMALLER_THEN) {
                    this.height = height;
                }

                // update related stuff and emit size
                // center container
                if (this.parentWidth !== null) {
                    this.x = (this.parentWidth - this.width) / 2;
                }
                this.$emit('width', this.width);
                this.$emit('height', this.height);
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
.container {
  & .wrapper {
    display: block;
    /* solves many problems with inline-blocks such as whitespace; https://caniuse.com/intrinsic-width */
    width: -moz-fit-content;
    width: fit-content;
    padding: 0;
    margin: 0;
    border: 0;
  }
}
</style>
