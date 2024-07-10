<script>
import PlusIcon from "@knime/styles/img/icons/plus-small.svg";

/**
 * Node ghost with a plus ([ + ]) that shows up when user drags a port to some free space.
 * Only works for direction = out ports
 */
export default {
  components: {
    PlusIcon,
  },
  props: {
    position: {
      type: Array,
      required: true,
    },
  },
  computed: {
    size() {
      return this.$shapes.addNodeGhostSize;
    },
    iconSize() {
      // eslint-disable-next-line no-magic-numbers
      return this.size * 0.9;
    },
    portSize() {
      return this.$shapes.portSize;
    },
    transformToCenter() {
      return [this.portSize / 2, -this.size / 2];
    },
  },
};
</script>

<template>
  <g :transform="`translate(${position})`">
    <g :transform="`translate(${transformToCenter})`">
      <rect :width="size" :height="size" rx="1" ry="1" />
      <PlusIcon
        :width="iconSize"
        :height="iconSize"
        :x="size / 2 - iconSize / 2"
        :y="size / 2 - iconSize / 2"
      />
    </g>
  </g>
</template>

<style lang="postcss" scoped>
rect {
  fill: var(--knime-gray-ultra-light);
  stroke-width: 1;
  stroke-dasharray: 2;
  stroke: var(--knime-silver-sand);
}

svg {
  fill: white;
}
</style>
