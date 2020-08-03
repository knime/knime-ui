<script>
/* eslint-disable no-magic-numbers */

export default {
    props: {
        /**
         * Port configuration object
         */
        port: {
            type: Object,
            required: true
        },
        /**
         * x coordinate of the port relative to the top left corner of the node
         */
        x: {
            type: Number,
            default: 0
        },
        /**
         * y coordinate of the port relative to the top left corner of the node
         */
        y: {
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

            let [x1, y1, x2, y3] = [0, -portSize / 2, portSize, portSize / 2];

            // adjust size of triangle so that filled and bordered triangle match, and the line width is exactly 1
            if (!shouldFill) {
                x1 += 1 / 2;
                y1 += (1 + Math.sqrt(5)) / 4;
                x2 -= Math.sqrt(5) / 2;
                y3 -= (1 + Math.sqrt(5)) / 4;
            }

            return `${x1},${y1} ${x2},${0} ${x1},${y3}`;
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${x - (inPort ? $shapes.portSize : 0)}, ${y})`"
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
      :width="$shapes.portSize - (shouldFill ? 0 : 1)"
      :height="$shapes.portSize - (shouldFill ? 0 : 1)"
      :x="shouldFill ? 0 : 0.5"
      :y="-$shapes.portSize / 2 + (shouldFill ? 0 : 0.5)"
      :fill="shouldFill ? customPortColor: 'none'"
      :stroke="shouldFill ? 'none' : customPortColor"
    />
    <path
      v-if="port.inactive"
      stroke-width="3"
      :stroke="$colors.portColors.inactiveOutline"
      :d="`M0,-${$shapes.portSize / 2} l${$shapes.portSize},${$shapes.portSize}
           m-${$shapes.portSize},0 l${$shapes.portSize},-${$shapes.portSize}`"
    />
    <path
      v-if="port.inactive"
      stroke-width="1"
      :stroke="$colors.portColors.inactive"
      :d="`M0,-${$shapes.portSize / 2} l${$shapes.portSize},${$shapes.portSize}
           m-${$shapes.portSize},0 l${$shapes.portSize},-${$shapes.portSize}`"
    />
  </g>
</template>

<style scoped>
.port {
  cursor: crosshair;
  pointer-events: bounding-box; /* SVG 2 bounding-box: already works in chromium, defaults to auto in firefox */
}
</style>
