<script>
/**
 * An arrow icon that is used to indicate a linked component / metanode.
 * For use inside the Node component.
 */
export default {
    props: {
        /**
         * Node type for determining the background color.
         * Allows the node types defined in $colors.nodeBackgroundColors
         * */
        backgroundType: {
            type: String,
            default: null
        },
        
        /**
         * The status of the link of a component (UpToDate, HasUpdate, Error)
         */
        linkStatus: {
            type: String,
            default: null
        }
    },
    computed: {
        backgroundColor() {
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
      v-if="!linkStatus || linkStatus === 'UP_TO_DATE'"
      d="M2.43 8.57L9.5 1.5M5 1.5L9.5 1.5L9.5 6"
      fill="none"
      stroke-linejoin="round"
      :stroke="$colors.linkDecorator"
      data-testid="arrow"
    />

    <!-- Dotted Arrow -->
    <path
      v-if="linkStatus === 'HAS_UPDATE'"
      d="M2.43 8.57L9.5 1.5M5 1.5L9.5 1.5L9.5 6"
      fill="none"
      stroke-linejoin="round"
      :stroke="$colors.linkDecorator"
      stroke-dasharray="1 1"
      data-testid="dotted-arrow"
    />

    <!-- Cross -->
    <g v-else-if="linkStatus === 'ERROR'">
      <path
        d="M2.4304 8.56863L9.50146 1.49756"
        :stroke="$colors.linkDecorator"
        data-testid="cross"
      />
      <path
        d="M9.50124 8.56863L2.43018 1.49756"
        :stroke="$colors.linkDecorator"
        data-testid="cross"
      />
    </g>
  </g>
</template>

<style lang="postcss" scoped>
g > * {
  pointer-events: none;
}
</style>
