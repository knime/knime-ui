<script>
/**
 * An arrow icon that is used to indicate a linked component / metanode.
 * For use inside the Node component.
 */
export default {
    props: {
        /**
         * Component type for determining the background color
         * */
        type: {
            type: String,
            default: null
        }
    },
    computed: {
        backgroundColor() {
            return this.$colors.nodeBackgroundColors[this.type];
        }
    }
};
</script>

<template>
  <g>
    <!-- Colored Background. This makes sure the arrow is well visible even if it overlaps with the node icon -->
    <path
      v-if="backgroundColor"
      d="M10.5618 0.436899C10.8432 0.718203 11.0012 1.09973 11.0012 1.49756L11.0012 6.99289L8.00119 6.99289L4.00586
        6.99978L4.00586 -0.00244141L9.50119 -0.00244115C9.89901 -0.00244115 10.2805 0.155594 10.5618 0.436899Z"
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

<style scoped>
g > * {
  pointer-events: none;
}
</style>
