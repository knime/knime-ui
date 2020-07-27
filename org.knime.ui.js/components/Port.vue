<script>
/* eslint-disable no-magic-numbers */

export default {
    props: {
        port: {
            type: Object,
            required: true
        },
        x: { // x-coordinate of port on the node
            type: Number,
            default: 0
        },
        y: { // y-coordinate of port on the node
            type: Number,
            default: 0
        },
        inPort: { // true if port is in-coming, false if port is outgoing
            type: Boolean,
            default: false
        }
    },
    computed: {
        // TODO: adjust port color NXT-219

        portDisplayStyle() {
            // TODO: port type instead of portObectClassName will be delivered by NXT-225
            switch (this.port.portType.portObjectClassName) {
            case 'org.knime.core.node.BufferedDataTable':
                return 'data';
            case 'org.knime.core.node.port.flowvariable.FlowVariablePortObject':
                return 'variable';
            default:
                return 'other';
            }
        },
        shouldFill() {
            return !this.port.portType.optional;
        },
        trianglePort() {
            let { x, y, $shapes: { portSize }, inPort, shouldFill } = this;
            
            if (inPort) {
                x -= portSize; // if port is in-coming, shift graphic to the left
            }
            
            let [x1, y1, x2, y2] = [x, y - portSize / 2, x + portSize, y + portSize / 2];

            // adjust size of triangle so that filled and bordered triangle match
            if (!shouldFill) {
                x1 += 0.5;
                y1 += 0.5;
                y2 -= 0.5;
                x2 -= 1;
            }

            return `${x1},${y1} ${x2},${y} ${x1},${y2}`;
        }
    }
};
</script>

<template>
  <g
    class="port"
    @mousedown="onMouseDown"
  >
    <polygon
      v-if="portDisplayStyle === 'data'"
      :points="trianglePort"
      :fill="shouldFill ? 'black' : 'none'"
      :stroke="shouldFill ? 'none': 'black'"
    />
    <circle
      v-else-if="portDisplayStyle === 'variable'"
      :r="$shapes.portSize/2 - (shouldFill ? 0 : 0.5)"
      :cx="x + $shapes.portSize / (inPort ? -2 : 2)"
      :cy="y"
      :fill="shouldFill ? 'red' : 'none'"
      :stroke="shouldFill ? 'none': 'red'"
    />
    <rect
      v-else
      :width="$shapes.portSize"
      :height="$shapes.portSize"
      :x="inPort ? x - $shapes.portSize : x"
      :y="y - $shapes.portSize / 2"
      fill="#6b6b6b"
    />
    <line
      v-if="port.inactive"
      stroke="red"
      stroke-width="1"
      :x1="inPort ? x - $shapes.portSize : x"
      :y1="y - $shapes.portSize / 2"
      :x2="inPort ? x : x + $shapes.portSize"
      :y2="y + $shapes.portSize / 2"
    />
    <line
      v-if="port.inactive"
      stroke="red"
      stroke-width="1"
      :x1="inPort ? x : x + $shapes.portSize"
      :y1="y - $shapes.portSize / 2"
      :x2="inPort ? x - $shapes.portSize : x"
      :y2="y + $shapes.portSize / 2"
    />
  </g>
</template>

<style scoped>
.port {
  cursor: crosshair;
  pointer-events: bounding-box; /* SVG 2 bounding-box: already works in chromium, defaults to auto in firefox */
}
</style>
