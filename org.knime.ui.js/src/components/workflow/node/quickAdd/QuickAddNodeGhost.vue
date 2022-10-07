<script>
import NestedSVG from '@/components/common/NestedSVG';
import PlusIcon from 'webapps-common/ui/assets/img/icons/plus-small.svg';

export default {
    components: {
        NestedSVG,
        PlusIcon
    },
    props: {
        position: {
            type: Array,
            required: true
        },
        direction: {
            type: String,
            default: 'out',
            validator: (t) => ['in', 'out'].includes(t)
        }
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
        adjustedPosition() {
            return this.direction === 'out'
                ? this.position
                : [this.position[0] - this.size - this.portSize, this.position[1]];
        },
        transformToCenter() {
            return [this.portSize / 2, -this.size / 2];
        }
    }
};
</script>

<template>
  <g :transform="`translate(${adjustedPosition})`">
    <g :transform="`translate(${transformToCenter})`">
      <rect
        :width="size"
        :height="size"
        rx="1"
        ry="1"
      />
      <NestedSVG
        :width="iconSize"
        :height="iconSize"
        :x="(size / 2) - iconSize / 2"
        :y="(size / 2) - iconSize / 2"
      >
        <PlusIcon />
      </NestedSVG>
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
