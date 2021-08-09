<script>
import PortWithTooltip from '~/components/PortWithTooltip';
import { portBar } from '~/mixins';

/**
 * A vertical bar holding ports. This is displayed in a metanode workflow to show the metanode's input / output ports.
 */
export default {
    components: { PortWithTooltip },
    mixins: [portBar],
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
            validator(val) {
                return ['in', 'out'].includes(val);
            }
        }
    },
    computed: {
        // horizontal center of ports
        portPositionX() {
            let delta = this.$shapes.portSize / 2;
            return this.type === 'out' ? -delta : delta;
        },
        portPositions() {
            // x-coordinate is absolute
            // y-coordinate is relative to PortBar
            return this.ports.map(port => [this.portPositionX + this.x, this.portBarItemYPos(port.index, this.ports)]);
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
    <PortWithTooltip
      v-for="(port, index) of ports"
      :key="`port-${index}`"
      :transform="`translate(${ portPositionX }, ${ portPositions[port.index][1] })`"
      :position="portPositions[port.index]"
      :port="port"
    />
  </g>
</template>

<style lang="postcss" scoped>
rect {
  cursor: ew-resize;
}
</style>
