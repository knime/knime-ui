<script>
/**
 * An arrow icon that is used to indicate a linked component / metanode.
 * For use inside the Node component.
 */
export default {
    props: {
        /**
         * Node type for determining the background color.
         * Allows the node types defined in $colors.nodeBackgroundColors and special 'Metanode'
         * */
        backgroundType: {
            type: String,
            default: null
        }
    },
    computed: {
        backgroundColor() {
            if (this.backgroundType === 'Metanode') {
                return 'white';
            }
            return this.$colors.nodeBackgroundColors[this.backgroundType];
        }
    }
};
</script>

<template>
  <g>
    <!-- Colored Background. This makes sure the arrow is well visible even if it overlaps with the node icon -->
    <rect
      v-if="backgroundColor"
      width="6"
      height="6"
      x="5"
      rx="1"
      ry="1"
      :fill="backgroundColor"
    />
    <!-- Arrow -->
    <path
      d="M2.43 8.57L9.5 1.5M5 1.5L9.5 1.5L9.5 6"
      fill="none"
      stroke-linejoin="round"
      :stroke="$colors.linkDecorator"
    />
  </g>
</template>

<style lang="postcss" scoped>
g > * {
  pointer-events: none;
}
</style>
