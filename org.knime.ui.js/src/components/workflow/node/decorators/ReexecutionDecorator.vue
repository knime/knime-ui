<script>
export default {
  props: {
    /**
     * Node type for determining the background color.
     * Allows the node types defined in $colors.nodeBackgroundColors
     * */
    backgroundType: {
      type: String,
      default: null,
    },
  },
  computed: {
    backgroundColor() {
      return this.$colors.nodeBackgroundColors[this.backgroundType];
    },
  },
};
</script>

<template>
  <g>
    <rect
      v-if="backgroundColor"
      width="4"
      height="4"
      x="1"
      y="5"
      rx="1"
      ry="1"
      :fill="backgroundColor"
    />

    <path d="M7.5 3H9.5V8H6.5" />
    <path d="M4 8H2V3H5" />
    <path d="M4 1.5L5.5 3L4 4.5" />
    <path d="M7.5 9.5L6 8L7.5 6.5" />
  </g>
</template>

<style scoped>
* {
  pointer-events: none;
}

path {
  fill: none;
  stroke: var(--knime-black);
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
