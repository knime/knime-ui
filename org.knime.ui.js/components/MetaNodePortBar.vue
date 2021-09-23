<script>
import DraggablePortWithTooltip from '~/components/DraggablePortWithTooltip.vue';
import { portBar, snapConnector } from '~/mixins';

/**
 * A vertical bar holding ports. This is displayed in a metanode workflow to show the metanode's input / output ports.
 */
export default {
    components: { DraggablePortWithTooltip },
    mixins: [portBar, snapConnector],
    provide() {
        return {
            // Provide position as anchorPoint for tooltips
            anchorPoint: this.position
        };
    },
    props: {
        /**
         * The position of the node. Contains of an x and a y parameter
         * The y coordinate is the topmost edge of the bar.
         * The x coordinate is the horizontal coordinate of the bar, at the point where the ports are attached.
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
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
        portDirection() {
            return this.type === 'out' ? 'in' : 'out';
        },
        // horizontal center of ports
        portPositionX() {
            let delta = this.$shapes.portSize / 2;
            return this.type === 'out' ? -delta : delta;
        },
        portPositions() {
            // x-coordinate is absolute
            // y-coordinate is relative to PortBar
            // format as required by snapConnector mixin
            return {
                [this.portDirection]: this.ports.map(port => [
                    this.portPositionX,
                    this.portBarItemYPos(port.index, this.ports)
                ])
            };
        },
        barPosition() {
            return this.type === 'out' ? 0 : -this.$shapes.metaNodeBarWidth;
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${position.x}, ${position.y})`"
    @connector-enter.stop="onConnectorEnter"
    @connector-leave.stop="onConnectorLeave"
    @connector-move.stop="onConnectorMove"
    @connector-drop.stop="onConnectorDrop"
  >
    <rect
      class="hover-area"
      :width="$shapes.metaNodeBarWidth + $shapes.metaNodeBarHorizontalPadding * 2"
      :height="portBarHeight"
      :x="barPosition - $shapes.metaNodeBarHorizontalPadding"
    />
    <rect
      class="port-bar"
      :width="$shapes.metaNodeBarWidth"
      :height="portBarHeight"
      :x="barPosition"
      :fill="$colors.named.Yellow"
    />
    <DraggablePortWithTooltip
      v-for="port of ports"
      :key="port.index"
      :relative-position="portPositions[portDirection][port.index]"
      :port="port"
      :direction="portDirection"
      :node-id="containerId"
      :targeted="targetPort && targetPort.index === port.index"
    />
  </g>
</template>

<style lang="postcss" scoped>
.port-bar {
  cursor: ew-resize;
}

.hover-area {
  fill: none;
  pointer-events: fill;
}
</style>
