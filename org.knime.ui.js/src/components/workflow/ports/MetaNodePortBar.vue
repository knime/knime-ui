<script>
import { portBar } from '@/mixins';
import NodeConnectorDetection from '@/components/workflow/connectors/ConnectorSnappingProvider.vue';
import NodePort from './NodePort.vue';

/**
 * A vertical bar holding ports. This is displayed in a metanode workflow to show the metanode's input / output ports.
 */
export default {
    components: { NodePort, NodeConnectorDetection },
    mixins: [portBar],
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
        
        portPositions() {
            const delta = this.$shapes.portSize / 2;
            // horizontal center of ports
            const positionX = this.type === 'out' ? -delta : delta;

            // x-coordinate is absolute
            // y-coordinate is relative to PortBar
            const mappedPorts = this.ports.map(port => [
                positionX,
                this.portBarItemYPos(port.index, this.ports)
            ]);
            
            return {
                in: this.portDirection === 'in' ? mappedPorts : [],
                out: this.portDirection === 'out' ? mappedPorts : []
            };
        },

        barPosition() {
            return this.type === 'out' ? 0 : -this.$shapes.metaNodeBarWidth;
        }
    }
};
</script>

<template>
  <NodeConnectorDetection
    :id="containerId"
    :disable-valid-target-check="true"
    :position="position"
    :port-positions="portPositions"
  >
    <template
      #default="{
        targetPort,
        on: {
          onConnectorEnter,
          onConnectorLeave,
          onConnectorMove,
          onConnectorDrop
        }
      }"
    >
      <g
        :transform="`translate(${position.x}, ${position.y})`"
        @connector-enter.stop="onConnectorEnter"
        @connector-leave.stop="onConnectorLeave"
        @connector-move.stop="onConnectorMove(
          $event,
          {
            inPorts: portDirection === 'in' ? ports : [],
            outPorts: portDirection === 'out' ? ports : [],
          }
        )"
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
        <NodePort
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
  </NodeConnectorDetection>
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
