<script>
import Port from '~/components/Port';

export default {
    components: { Port },
    props: {
        x: {
            type: Number,
            default: 0
        },
        y: {
            type: Number,
            default: 0
        },
        height: {
            type: Number,
            default: 0
        },
        ports: {
            type: Array,
            required: true
        },
        type: {
            type: String,
            default: 'in'
        }
    },
    methods: {
        portPositionX(port) {
            let delta = this.$shapes.portSize / 2;
            return this.type === 'out' ? -delta : 10 + delta;
        },
        portPositionY(port) {
            let index = port.index;
            let total = this.ports.length;
            return this.height * (index + 1) / (total + 1);
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${x + type === 'out' ? x : x - 10}, ${y})`"
  >
    <rect
      width="10"
      :height="height"
      :fill="$colors.named.Yellow"
    />
    <Port
      v-for="(port, index) of ports"
      :key="`port-${index}`"
      :x="portPositionX(port)"
      :y="portPositionY(port)"
      :port="port"
    />
  </g>
</template>

<style lang="postcss" scoped>
rect {
  cursor: ew-resize;
}
</style>
