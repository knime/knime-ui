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
        }
    },
    computed: {
        inPort() {
            return this.port.type === 'NodeInPort';
        },
        portType() {
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
        customPortColor() {
            // TODO: adjust port color NXT-219
            return 'grey';
        },
        trianglePort() {
            let { $shapes: { portSize }, shouldFill } = this;

            let [x1, y1, x2, y2] = [0, -portSize / 2, portSize, portSize / 2];

            // adjust size of triangle so that filled and bordered triangle match
            if (!shouldFill) {
                x1 += 0.5;
                y1 += 0.5;
                y2 -= 0.5;
                x2 -= 1;
            }

            return `${x1},${y1} ${x2},${0} ${x1},${y2}`;
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${x - (inPort ? $shapes.portSize : 0)},${y})`"
    class="port"
  >
    <polygon
      v-if="portType === 'data'"
      :points="trianglePort"
      :fill="shouldFill ? $colors.portColors.data : 'none'"
      :stroke="shouldFill ? 'none': $colors.portColors.data"
    />
    <circle
      v-else-if="portType === 'variable'"
      :r="$shapes.portSize / 2 - (shouldFill ? 0 : 0.5)"
      :cx="$shapes.portSize / 2"
      :fill="shouldFill ? $colors.portColors.variable : 'none'"
      :stroke="shouldFill ? 'none': $colors.portColors.variable"
    />
    <rect
      v-else
      :width="$shapes.portSize"
      :height="$shapes.portSize"
      :y="-$shapes.portSize / 2"
      :fill="shouldFill ? customPortColor: 'none'"
      :stroke="shouldFill ? 'none' : customPortColor"
    />
    <line
      v-if="port.inactive"
      stroke-width="1"
      :stroke="$colors.portColors.inactive"
      :y1="-$shapes.portSize / 2"
      :x2="$shapes.portSize"
      :y2="$shapes.portSize / 2"
    />
    <line
      v-if="port.inactive"
      stroke-width="1"
      :stroke="$colors.portColors.inactive"
      :x1="$shapes.portSize"
      :y1="-$shapes.portSize / 2"
      :y2="$shapes.portSize / 2"
    />
  </g>
</template>

<style scoped>
.port {
  cursor: crosshair;
  pointer-events: bounding-box; /* SVG 2 bounding-box: already works in chromium, defaults to auto in firefox */
}
</style>
