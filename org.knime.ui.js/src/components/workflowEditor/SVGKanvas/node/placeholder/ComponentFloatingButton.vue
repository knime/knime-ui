<script setup lang="ts">
type Props = {
  x?: number;
  icon: any | null;
};

withDefaults(defineProps<Props>(), {
  x: 0,
});

const iconSize = 10;
</script>

<template>
  <g class="floating-button" :transform="`translate(${x}, 0)`">
    <circle r="9.5" />
    <Component :is="icon" :width="iconSize" :height="iconSize" x="-5" y="-5" />
  </g>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.floating-button {
  & circle {
    fill: white;
    stroke: var(--knime-silver-sand);
    cursor: pointer;

    &:hover {
      fill: var(--knime-masala);
      stroke: var(--knime-masala);
    }

    &:active {
      fill: var(--knime-black);
      filter: none;
      stroke: var(--knime-black);
    }
  }

  & svg {
    @mixin svg-icon-size v-bind("iconSize");

    stroke: var(--knime-masala);
    pointer-events: none;
  }

  &:hover svg {
    stroke: var(--knime-white);
  }

  &:active svg {
    stroke: var(--knime-white);
  }
}
</style>
