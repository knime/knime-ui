<script>
/**
 * An SVG decorator component which displays icons for loop execution state.
 * For use in a Node component.
 */
export default {
  props: {
    /**
     *  Loop specific configuration options
     */
    loopStatus: {
      type: String,
      default: null,
    },
  },
  computed: {
    backgroundColor() {
      return this.$colors.nodeBackgroundColors.Loop;
    },
  },
};
</script>

<template>
  <g v-if="loopStatus === 'PAUSED'" class="pause">
    <!-- Loop execution paused. -->
    <path
      fill-rule="evenodd"
      d="M0.441293 0.440316C0.722598 0.159012 1.10413 0.000976478 1.50195 0.000976562L6.99728 0.000977039L6.99728
        3.00098L7.00418 6.9963L0.00195312 6.9963L0.00195338 1.50098C0.00195338 1.10315 0.159989 0.721621 0.441293
        0.440316Z"
      :fill="backgroundColor"
    />
    <path
      d="M5 9.0625C7.24366 9.0625 9.0625 7.24366 9.0625 5C9.0625 2.75634 7.24366 0.9375 5 0.9375C2.75634 0.9375
        0.9375 2.75634 0.9375 5C0.9375 7.24366 2.75634 9.0625 5 9.0625Z"
      stroke="#3E3A39"
      stroke-linejoin="round"
      :fill="backgroundColor"
    />
    <path d="M4.04102 3.104V6.89588" stroke="#3E3A39" stroke-linejoin="round" />
    <path d="M5.95898 6.89588V3.104" stroke="#3E3A39" stroke-linejoin="round" />
  </g>
  <g v-else-if="loopStatus === 'RUNNING'" class="running">
    <!-- Loop execution running. -->
    <path
      fill-rule="evenodd"
      d="M0.441293 0.440316C0.722598 0.159012 1.10413 0.000976478 1.50195 0.000976562L6.99728 0.000977039L6.99728
        3.00098L7.00418 6.9963L0.00195312 6.9963L0.00195338 1.50098C0.00195338 1.10315 0.159989 0.721621 0.441293
        0.440316Z"
      :fill="backgroundColor"
    />
    <path
      d="M6.28125 6.96875L5.4375 8.34375L6.84375 9.21875"
      stroke="#3E3A39"
      stroke-linejoin="round"
    />
    <path
      d="M5.4375 8.34375C7.1875 8.125 8.53125 6.78125 8.53125 5C8.53125 3.40625 7.46875 2.0625 6 1.625"
      stroke="#3E3A39"
      stroke-linejoin="round"
      :fill="backgroundColor"
    />
    <path
      d="M3.75 3.03125L4.5625 1.65625L3.15625 0.78125"
      stroke="#3E3A39"
      stroke-linejoin="round"
    />
    <path
      d="M4.5625 1.65625C2.8125 1.875 1.46875 3.21875 1.46875 5C1.46875 6.59375 2.53125 7.9375 4 8.375"
      stroke="#3E3A39"
      stroke-linejoin="round"
      :fill="backgroundColor"
    />
  </g>
</template>

<style lang="postcss" scoped>
g {
  pointer-events: none;
}
</style>
