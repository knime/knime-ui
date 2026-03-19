<script setup lang="ts">
type Props = {
  x?: number;
  icon: unknown | null;
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
    cursor: pointer;
    fill: white;
    stroke: var(--knime-silver-sand);

    &:hover {
      fill: var(--knime-masala);
      stroke: var(--knime-masala);
    }

    &:active {
      filter: none;
      fill: var(--knime-black);
      stroke: var(--knime-black);
    }
  }

  & svg {
    @mixin svg-icon-size v-bind("iconSize");

    pointer-events: none;
    stroke: var(--knime-masala);
  }

  &:hover svg {
    stroke: var(--knime-white);
  }

  &:active svg {
    stroke: var(--knime-white);
  }
}
</style>
