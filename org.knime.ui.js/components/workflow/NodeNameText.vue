<script>
import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject';

/**
 * Renders the node name and takes care of styling and clipping it when the contents are too large.
 * It wraps around AutoSizeForeignObject to render custom elements inside svg and forwards its events
 * and slot props
 */
export default {
    components: { AutoSizeForeignObject },
    props: {
        /**
         * Determines whether the name is editable. It will not emit the request-edit
         * event if it's not editable
         */
        editable: {
            type: Boolean,
            default: false
        },
        /**
         * The node's name text itself
         */
        value: {
            type: String,
            default: ''
        },
        /**
         * Whether to show the whole text when it overflows the calculated clipping point
         */
        showOverflow: {
            type: Boolean,
            default: false
        },
        /**
         * Forwarded to the AutoSizeForeignObject component
         */
        startWidth: {
            type: Number,
            default: null
        },
        /**
         * Forwarded to the AutoSizeForeignObject component
         */
        startHeight: {
            type: Number,
            default: null
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    :start-width="startWidth"
    :start-height="startHeight"
    :class="['node-name-text-container', { editable, 'text-ellipsis': !showOverflow }]"
    :max-width="$shapes.maxNodeNameWidth"
    :y-offset="-$shapes.nodeNameMargin"
    :parent-width="$shapes.nodeSize"
    offset-by-height
    @width-change="$emit('width-change', $event)"
    @height-change="$emit('height-change', $event)"
  >
    <template #default="{ on }">
      <div
        class="node-name"
        @click.prevent="$emit('click', $event)"
        @contextmenu="$emit('contextmenu', $event)"
        @dblclick.left.prevent.stop="editable ? $emit('request-edit') : null"
        @mouseleave="$emit('mouseleave', $event)"
        @mouseenter="$emit('mouseenter', $event)"
      >
        <span
          :style="{ 'max-width': `${$shapes.maxNodeNameWidth}px` }"
          :title="showOverflow ? null : value"
          class="text"
        >
          <slot :on="on">{{ value }}</slot>
        </span>
      </div>
    </template>
  </AutoSizeForeignObject>
</template>

<style lang="postcss" scoped>
.node-name-text-container {
  font-family: "Roboto Condensed", sans-serif;
  cursor: default;
  user-select: none;

  &.editable:hover {
    cursor: pointer;
  }

  & .text {
    font-family: "Roboto Condensed", sans-serif;
    font-style: normal;
    font-weight: 700;
    font-size: calc(var(--node-name-font-size-shape) * 1px);
    margin: 0;
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
