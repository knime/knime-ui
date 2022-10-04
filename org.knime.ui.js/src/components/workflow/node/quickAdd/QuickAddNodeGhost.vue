<script>
import NestedSVG from '@/components/common/NestedSVG';
import PlusIcon from 'webapps-common/ui/assets/img/icons/circle-plus.svg';

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
            required: true,
            validator: (t) => ['in', 'out'].includes(t)
        }
    },
    computed: {
        size() {
            return this.$shapes.nodeSize;
        },
        portSize() {
            return this.$shapes.portSize;
        },
        relativePosition() {
            return this.direction === 'out'
                ? this.position
                : [this.position[0] - this.size - this.portSize, this.position[1]];
        }
    }
};
</script>

<template>
  <g :transform="`translate(${relativePosition})`">
    <g :transform="`translate(${portSize / 2}, ${-size / 2})`">
      <rect
        :width="size"
        :height="size"
      />
      <NestedSVG
        width="20"
        height="20"
        :x="(size / 2) - 10"
        :y="(size / 2) - 10"
      >
        <PlusIcon />
      </NestedSVG>
    </g>
  </g>
</template>
<style lang="postcss" scoped>
rect {
  fill: #e6f5e7; /* TODO: move to colors or use a color var */
  stroke-width: 1;
  stroke-dasharray: 2;
  stroke: var(--knime-stone-gray);
}

svg {
  fill: white;
}
</style>
