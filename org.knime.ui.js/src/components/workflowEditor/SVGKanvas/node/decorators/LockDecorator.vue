<script lang="ts">
import { defineComponent } from "vue";

/**
 * A lock icon that is used to indicate an un-/locked component / metanode.
 * For use inside the Node component.
 */
export default defineComponent({
  props: {
    /**
     * Node type for determining the background color.
     * Allows the node types defined in $colors.nodeBackgroundColors
     * */
    backgroundType: {
      type: String,
      default: null,
    },
    isLocked: {
      type: Boolean,
      required: true,
    },
  },
  computed: {
    backgroundColor() {
      const type = this
        .backgroundType as keyof typeof this.$colors.nodeBackgroundColors;

      return type in this.$colors.nodeBackgroundColors
        ? this.$colors.nodeBackgroundColors[type]
        : // eslint-disable-next-line no-undefined
          undefined;
    },
  },
});
</script>

<template>
  <g>
    <!-- Colored Background. This makes sure the lock is well visible even if it overlaps with the node icon -->
    <rect
      v-if="backgroundColor"
      width="6"
      height="6"
      x="0"
      y="5"
      rx="1"
      ry="1"
      :fill="backgroundColor"
    />

    <!-- Locked -->
    <g v-if="isLocked">
      <path d="M7.43753 3.99902H1.5625V8.12524H7.43753V3.99902Z" />
      <path d="M4.5 6.89504V5.71436" />
      <path
        d="M2.53125 3.99892V2.84326C2.53125 1.75651 3.41297 0.874512 4.5 0.874512C5.58759 0.874512 6.46875 1.75651 6.46875 2.84326V3.99892"
      />
      <path d="M3.97705 5.71436H5.0233" />
    </g>

    <g v-else>
      <g>
        <path d="M8.43753 3.99902H2.5625V8.12524H8.43753V3.99902Z" />
        <path d="M5.5 6.89504V5.71436" />
        <path
          d="M0.53125 3.99892V2.84326C0.53125 1.75651 1.41297 0.874512 2.5 0.874512C3.58759 0.874512 4.46875 1.75651 4.46875 2.84326V3.99892"
        />
        <path d="M4.97705 5.71436H6.0233" />
      </g>
    </g>
  </g>
</template>

<style lang="postcss" scoped>
g > * {
  pointer-events: none;
}

path {
  fill: none;
  stroke: var(--knime-black);
  stroke-linejoin: round;
  stroke-miterlimit: 10;
}
</style>
