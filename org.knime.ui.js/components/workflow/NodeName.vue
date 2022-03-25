<script>
import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject';

/**
 * A rectangular box containing text. It uses <foreignObject> and automatically updates the size based on the contents.
 * It offers limits to the size and always centers around the node.
 */
export default {
    components: { AutoSizeForeignObject },
    props: {
        editable: {
            type: Boolean,
            default: false
        },
        value: {
            type: String,
            default: ''
        },
        showOverflow: {
            type: Boolean,
            value: false
        },
        /**
         * Optional hook that is called before the dimension is adjusted.
         */
        adjustDimensionBeforeHook: {
            type: Function,
            default: () => null
        }
    },
    computed: {
        maxWidth() {
            return this.$shapes.maxNodeNameWidth;
        }
    },
    watch: {
        value(newValue) {
            this.adjustDimensions();
        }
    },
    mounted() {
        this.adjustDimensions();
    },
    methods: {
        adjustDimensions() {
            this.$refs.container?.adjustDimensions();
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    ref="container"
    :class="['container', {editable, 'text-ellipsis': !showOverflow }]"
    :max-width="maxWidth"
    :y-shift="-$shapes.nodeNameMargin"
    :parent-width="$shapes.nodeSize"
    :adjust-dimension-before-hook="adjustDimensionBeforeHook"
    shift-by-height
    @width="$emit('width', $event)"
    @height="$emit('height', $event)"
  >
    <div
      class="node-name"
      @click.prevent.stop="$emit('click', $event)"
      @contextmenu.prevent="$emit('contextmenu', $event)"
      @dblclick.left.prevent.stop="editable ? $emit('request-edit') : null"
      @mouseleave="$emit('mouseleave', $event)"
      @mouseenter="$emit('mouseenter', $event)"
    >
      <span
        :style="{'max-width': `${maxWidth}px`}"
        :title="showOverflow ? '' : (editable ? 'Double click to edit: ' : '') + value"
        class="text"
      ><slot>{{ value }}</slot></span>
    </div>
  </AutoSizeForeignObject>
</template>

<style lang="postcss" scoped>
.container {
  font-family: "Roboto Condensed", sans-serif;
  cursor: default;
  user-select: none;

  &.editable:hover {
    cursor: pointer;
  }

  & .text {
    font-family: "Roboto Condensed", sans-serif;
    font-style: normal;
    font-weight: bold;
    font-size: calc(var(--node-name-font-size-shape) * 1px);
    margin: 0;
    white-space: pre-wrap;
    text-align: inherit;
  }

  &.text-ellipsis .text {
    /* multiline overflow ellipsis -
       also supported in Firefox (yes with -webkit prefix) https://caniuse.com/css-line-clamp */
    word-wrap: break-word;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--node-name-max-lines-shape);
    overflow: hidden;
  }

  & .node-name {
    text-align: center;
    padding: calc(var(--node-name-padding-shape) * 1px);
    overflow: hidden;
    line-height: calc(var(--node-name-line-height-shape) * 1px);
  }
}
</style>
