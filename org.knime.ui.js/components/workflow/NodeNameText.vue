<script>
import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject';

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
            default: false
        },
        startWidth: {
            type: Number,
            default: null
        },
        startHeight: {
            type: Number,
            default: null
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    ref="container"
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
        @click.prevent.stop="$emit('click', $event)"
        @contextmenu.prevent="$emit('contextmenu', $event)"
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
    font-weight: bold;
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
