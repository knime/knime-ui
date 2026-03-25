<script lang="ts">
import { defineComponent } from "vue";

import AutoSizeForeignObject from "@/components/common/AutoSizeForeignObject.vue";

/**
 * Renders the node name and takes care of styling and clipping it when the contents are too large.
 * It wraps around AutoSizeForeignObject to render custom elements inside svg and forwards its events
 * and slot props
 */
export default defineComponent({
  components: { AutoSizeForeignObject },
  props: {
    /**
     * Determines whether the name is editable. It will not emit the request-edit
     * event if it's not editable
     */
    editable: {
      type: Boolean,
      default: false,
    },
    /**
     * The node's name text itself
     */
    value: {
      type: String,
      default: "",
    },
    /**
     * Whether to show the whole text when it overflows the calculated clipping point
     */
    showOverflow: {
      type: Boolean,
      default: false,
    },
    /**
     * Forwarded to the AutoSizeForeignObject component
     */
    startWidth: {
      type: Number,
      default: null,
    },
    /**
     * Forwarded to the AutoSizeForeignObject component
     */
    startHeight: {
      type: Number,
      default: null,
    },
  },
  emits: [
    "widthChange",
    "heightChange",
    "click",
    "requestEdit",
    "mouseenter",
    "mouseleave",
  ],
});
</script>

<template>
  <AutoSizeForeignObject
    :value="value"
    :start-width="startWidth"
    :start-height="startHeight"
    :class="[
      'node-name-text-container',
      { editable, 'text-ellipsis': !showOverflow },
    ]"
    :max-width="$shapes.maxNodeNameWidth"
    :y-offset="-$shapes.nodeNameMargin"
    :parent-width="$shapes.nodeSize"
    offset-by-height
    @width-change="$emit('widthChange', $event)"
    @height-change="$emit('heightChange', $event)"
  >
    <div
      class="node-name"
      @click.prevent="$emit('click', $event)"
      @dblclick.left.prevent.stop="editable ? $emit('requestEdit') : null"
      @mouseleave="$emit('mouseleave', $event)"
      @mouseenter="$emit('mouseenter', $event)"
    >
      <span
        :style="{ 'max-width': `${$shapes.maxNodeNameWidth}px` }"
        :title="showOverflow ? undefined : value"
        class="text"
      >
        <slot>{{ value }}</slot>
      </span>
    </div>
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
    min-width: 60px;
    margin: 0;
    font-family: "Roboto Condensed", sans-serif;
    font-size: calc(v-bind("$shapes.nodeNameFontSize") * 1px);
    font-style: normal;
    font-weight: 700;
    text-align: inherit;
    -webkit-font-smoothing: antialiased;
  }

  &.text-ellipsis .text {
    /* stylelint-disable-next-line value-no-vendor-prefix */
    display: -webkit-box;
    text-overflow: ellipsis;
    -webkit-line-clamp: v-bind("$shapes.nodeNameMaxLines");

    /* multiline overflow ellipsis -
       also supported in Firefox (yes with -webkit prefix) https://caniuse.com/css-line-clamp */
    word-wrap: break-word;
    -webkit-box-orient: vertical;
  }

  & .node-name {
    padding: calc(v-bind("$shapes.nodeNamePadding") * 1px);
    overflow: hidden;
    line-height: calc(v-bind("$shapes.nodeNameLineHeight") * 1px);
    text-align: center;
  }
}
</style>
