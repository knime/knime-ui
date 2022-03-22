<script>
import { mapState } from 'vuex';

/**
 * A rectangular box containing text. It uses <foreignObject> and automatically updates the size based on the contents.
 * It offers limits to the size and always centers around the node.
 */
export default {
    inheritAttrs: false,
    props: {
        editable: {
            type: Boolean,
            default: false
        },
        maxWidth: {
            type: Number,
            default: 1000
        },
        text: {
            type: String,
            default: ''
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
            width: this.maxWidth,
            height: 0,
            x: 0
        };
    },
    computed: {
        ...mapState('canvas', ['zoomFactor']),
        y() {
            return -(this.height + this.$shapes.nodeNameMargin) + this.yShift;
        }
    },
    watch: {
        text() {
            this.adjustDimensions();
        }
    },
    mounted() {
        this.adjustDimensions();
    },
    methods: {
        // foreignObject requires `width` and `height` attributes, or the content is cut off.
        // So we need to 1. render, 2. measure, 3. update
        adjustDimensions() {
            // 1. render with max width
            this.width = this.maxWidth;
            this.$nextTick(() => { // wait for re-render
                // 2. measure content's actual size
                let rect = this.$refs.text?.getBoundingClientRect();
                if (!rect) {
                    consola.error('Tried to adjust dimensions of NodeTitle, but element is gone or is not a DOM Node');
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
                // report width to parent if bigger then default
                if (this.width > this.$shapes.nodeSelectionDefaultWidth) {
                    this.$emit('width', this.width);
                }
                this.$emit('height', this.height);
            });
        }
    }
};
</script>

<template>
  <foreignObject
    :class="['container', {editable}]"
    :width="width"
    :height="height"
    :x="x"
    :y="y"
  >
    <div
      ref="text"
      class="wrapper"
      @click.prevent.stop="$emit('click', $event)"
      @contextmenu.prevent="$emit('contextmenu', $event)"
      @dblclick.left.prevent.stop="editable ? $emit('request-edit') : null"
    >
      <span class="text" :title="text">{{ text }}</span>
    </div>
  </foreignObject>
</template>

<style lang="postcss" scoped>
.container {
  font-family: "Roboto Condensed", sans-serif;
  cursor: default;
  user-select: none;

  &.editable:hover {
    outline: 1px solid var(--knime-silver-sand);
    cursor: pointer;
  }

  & .text {
    font-family: "Roboto Condensed", sans-serif;
    font-style: normal;
    font-weight: bold;
    font-size: calc(var(--node-name-font-size-shape) * 1px);
    margin: 0;
    white-space: pre-wrap;

    /* multiline overflow ellipsis*/
    text-overflow: ellipsis;
    max-height: 100%;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--node-name-max-lines-shape);
  }

  & .wrapper {
    display: inline-block;
    text-align: center;

    padding: calc(var(--node-name-padding-shape) * 1px);
    overflow: hidden;
    line-height: calc(var(--node-name-line-height-shape) * 1px);
  }
}
</style>
