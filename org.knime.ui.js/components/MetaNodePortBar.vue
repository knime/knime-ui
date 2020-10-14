<script>
import Port from '~/components/Port';
import { portBar } from '~/mixins';

/**
 * A vertical bar holding ports. This is displayed in a metanode workflow to show the metanode's input / output ports.
 */
export default {
    components: { Port },
    mixins: [portBar],
    provide() {
        return {
            anchorPoint: {
                x: this.x,
                y: this.y
            }
        };
    },
    props: {
        /**
         * The horizontal coordinate of the bar, at the point where the ports are attached.
        */
        x: {
            type: Number,
            default: 0
        },
        /**
         * The y coordinate of the topmost edge of the bar.
        */
        y: {
            type: Number,
            default: 0
        },
        /**
         * A list of port configurations, passed-through to `Port`
         */
        ports: {
            type: Array,
            required: true
        },
        /**
         * Type of port bar. One of `in`/`out`. Defaults to `in`.
         * `in` means the bar containing the metanodes input ports, and vice versa.
         */
        type: {
            type: String,
            default: 'in',
            validator(val = 'in') {
                return ['in', 'out'].includes(val);
            }
        }
    },
    methods: {
        // horizontal center of ports
        portPositionX(port) {
            let delta = this.$shapes.portSize / 2;
            return this.type === 'out' ? -delta : delta;
        },
        // vertical center of ports
        portPositionY(port) {
            return this.portBarItemYPos(port.index, this.ports);
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
  >
    <rect
      :width="$shapes.metaNodeBarWidth"
      :height="portBarHeight"
      :x="type === 'out' ? null : -$shapes.metaNodeBarWidth"
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
