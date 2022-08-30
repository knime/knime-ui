<script>
import { mapState } from 'vuex';
const MINIMUM_SIZE_CHANGE = 1; // pixel

/**
 * A <foreignObject> that can be used in SVG to render HTML. It automatically updates the size based on the contents.
 * Updates to the contents can be done via `adjustDimensions` method.
 * It offers limits to the size and always centers around a given parentWidth. It issues 'width' and 'height' events
 * when the size is adjusted so other drawings can update.
 */
export default {
    props: {
        /**
         * Similar to Vue's native key attribute we can
         * use this prop's changes to signal this component
         * that it should re-run its sizing calculations
         *
         * Note that we can't use Vue's native key attribute
         * as we want to have more control of when we want to
         * trigger this behavior
         */
        resizeKey: {
            type: String,
            required: false,
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
        },
        /* start width to use instead of performing calculation on mount */
        startWidth: {
            type: Number,
            default: null
        },
        /* start height to use instead of performing calculation on mount */
        startHeight: {
            type: Number,
            default: null
        }
    },
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
        ...mapState('canvas', ['zoomFactor']),
        y() {
            if (this.offsetByHeight) {
                return -this.height + this.yOffset;
            }
            return this.yOffset;
        }
    },
    watch: {
        resizeKey(newVal, prevVal) {
            if (newVal !== prevVal) {
                this.adjustDimensions();
            }
        }
    },
    mounted() {
        // if initial dimensions are provided use those instead
        // of performing the calculation
        if (this.startWidth && this.startHeight) {
            this.width = this.startWidth;
            this.height = this.startHeight;
            this.centerAroundParentWidth();
            this.emitDimensions();
        } else {
            this.adjustDimensions();
        }
    },
    methods: {
        centerAroundParentWidth() {
            if (this.parentWidth !== null) {
                this.x = (this.parentWidth - this.width) / 2;
            }
        },
        
        // foreignObject requires `width` and `height` attributes, or the content is cut off.
        // So we need to 1. render, 2. measure, 3. update
        async adjustDimensions() {
            const lastWidth = this.width;
            // 1. render with max width or given startWidth
            this.width = this.maxWidth;
            
            // wait for re-render
            await this.$nextTick();
            await this.$nextTick();

            // 2. measure content's actual size
            const rect = this.$refs.wrapper?.getBoundingClientRect();
            if (!rect) {
                consola.error('Tried to adjust dimensions of NodeTitle, but element is gone or is not a DOM Node');
                return;
            }

            // account for zoom
            const width = Math.ceil(rect.width / this.zoomFactor);
            const height = Math.ceil(rect.height / this.zoomFactor);
            
            // 3. set container size to content size
            // avoid width jitter
            this.width = Math.abs(lastWidth - width) > MINIMUM_SIZE_CHANGE ? width : lastWidth;

            // avoid height jitter
            if (Math.abs(this.height - height) > MINIMUM_SIZE_CHANGE) {
                this.height = height;
            }
    
            this.centerAroundParentWidth();
    
            this.emitDimensions();
        },

        emitDimensions() {
            this.$emit('width-change', this.width);
            this.$emit('height-change', this.height);
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
      <slot :on="{ sizeChange: adjustDimensions }" />
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
    width: -moz-fit-content;
    width: fit-content;
  }
}
</style>
