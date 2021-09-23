<script>
import DraggablePortWithTooltip from '~/components/DraggablePortWithTooltip.vue';
import { portBar } from '~/mixins';

/**
 * A vertical bar holding ports. This is displayed in a metanode workflow to show the metanode's input / output ports.
 */
export default {
    components: { DraggablePortWithTooltip },
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
        },
        /** Id of the metanode, this PortBar is inside of */
        containerId: {
            type: String,
            required: true
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
            return this.ports.map(port => [this.x + this.portPositionX, this.portBarItemYPos(port.index, this.ports)]);
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(0, ${y})`"
  >
    <rect
      :width="$shapes.metaNodeBarWidth"
      :height="portBarHeight"
      :x="type === 'out' ? x : x - $shapes.metaNodeBarWidth"
      :fill="$colors.named.Yellow"
    />
    <DraggablePortWithTooltip
      v-for="port of ports"
      :key="port.index"
      :relative-position="portPositions[port.index]"
      :port="port"
      :direction="type === 'in' ? 'out' : 'in'"
      :node-id="containerId"
    />
  </g>
</template>

<style lang="postcss" scoped>
rect {
  cursor: ew-resize;
}
</style>
