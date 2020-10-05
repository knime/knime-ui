<script>
import { mapMutations } from 'vuex';
/* eslint-disable no-magic-numbers */

export default {
    inject: ['nodeId'],
    props: {
        /**
         * Port configuration object
         */
        port: {
            type: Object,
            required: true,
            validator: port => (typeof port.inactive === 'boolean' || !port.inactive) && typeof port.type === 'string'
        },
        /**
         * x coordinate of the port's center relative to the top left corner of the node
         */
        x: {
            type: Number,
            default: 0
        },
        /**
         * y coordinate of the port's center relative to the top left corner of the node
         */
        y: {
            type: Number,
            default: 0
        }
    },
    computed: {
        shouldFill() {
            if (this.port.type === 'flowVariable' && this.port.index === 0) {
                // Mickey Mouse ears are always rendered filled, even though they may technically be optional
                return true;
            }
            return !this.port.optional;
        },
        customPortColor() {
            return this.port.color;
        },
        trianglePath() {
            let { $shapes: { portSize } } = this;

            let [x1, y1, x2, y3] = [-portSize / 2, -portSize / 2, portSize / 2, portSize / 2];

            // adjust size of triangle so that filled and bordered triangle match, and the line width is exactly 1
            x1 += 1 / 2;
            y1 += (1 + Math.sqrt(5)) / 4;
            x2 -= Math.sqrt(5) / 2;
            y3 -= (1 + Math.sqrt(5)) / 4;

            return `${x1},${y1} ${x2},${0} ${x1},${y3}`;
        },
        /**
         * the traffic light of a metanode port displays the state of the inner node that it is connected to
         * @returns {'red' | 'yellow' | 'green' | undefined} traffic light color
         */
        trafficLight() {
            return {
                IDLE: 'red',
                CONFIGURED: 'yellow',
                EXECUTING: 'yellow',
                QUEUED: 'yellow',
                HALTED: 'green',
                EXECUTED: 'green'
            }[this.port.nodeState];
        },
        tooltip() {
            // table ports have less space than other ports, because the triangular shape naturally creates a gap
            let tooltipSpacing = this.port.type === 'table' ? 0 : 2;
            const { portSize } = this.$shapes;
            return {
                x: this.x,
                y: this.y - portSize / 2 - tooltipSpacing,
                anchor: this.nodeId,
                title: this.port.name,
                text: this.port.info,
                orientation: 'top'
            };
        }
    },
    methods: {
        ...mapMutations('workflow', ['setTooltip']),
        onMouseEnter() {
            this.setTooltip(this.tooltip);
        },
        onMouseLeave() {
            this.setTooltip(null);
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
    class="port"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- data table port -->
    <polygon
      v-if="port.type === 'table'"
      :points="trianglePath"
      :fill="shouldFill ? $colors.portColors.data : 'white'"
      :stroke="$colors.portColors.data"
    />
    <!-- flow variable port -->
    <circle
      v-else-if="port.type === 'flowVariable'"
      :r="$shapes.portSize / 2 - 0.5"
      :fill="shouldFill ? $colors.portColors.variable : 'white'"
      :stroke="$colors.portColors.variable"
    />
    <!-- other port -->
    <rect
      v-else
      :width="$shapes.portSize - 1"
      :height="$shapes.portSize - 1"
      :x="-$shapes.portSize / 2 + 0.5"
      :y="-$shapes.portSize / 2 + 0.5"
      :fill="shouldFill ? customPortColor: 'white'"
      :stroke="customPortColor"
    />
    <!-- X outline -->
    <path
      v-if="port.inactive"
      stroke-width="3"
      :stroke="$colors.portColors.inactiveOutline"
      :d="`M-${$shapes.portSize / 2},-${$shapes.portSize / 2} l${$shapes.portSize},${$shapes.portSize}
           m-${$shapes.portSize},0 l${$shapes.portSize},-${$shapes.portSize}`"
    />
    <!-- X -->
    <path
      v-if="port.inactive"
      stroke-width="1.5"
      :stroke="$colors.portColors.inactive"
      :d="`M-${$shapes.portSize / 2},-${$shapes.portSize / 2} l${$shapes.portSize},${$shapes.portSize}
           m-${$shapes.portSize},0 l${$shapes.portSize},-${$shapes.portSize}`"
    />
    <!-- metanode port traffic light -->
    <g
      v-if="trafficLight"
    >
      <g
        transform="translate(-5.5, 0)"
        fill="none"
      >
        <circle
          r="3.5"
          fill="white"
        />
        <circle
          r="3"
          :fill="$colors.trafficLight[trafficLight]"
        />
        <path
          :d="`M2.5,0a1,1 0 0 0 -5,0a1,1 0 0 0 5,0${
            trafficLight === 'yellow' || trafficLight === 'green' ? 'h-5' : ''
          }`"
          fill="none"
          :stroke="$colors.darkeningMask"
          :transform="trafficLight === 'yellow' ? 'rotate(90)' : null"
        />
      </g>
    </g>
  </g>
</template>

<style lang="postcss" scoped>
.port {
  cursor: crosshair;
  pointer-events: bounding-box; /* SVG 2 bounding-box: already works in chromium, defaults to auto in firefox */

  & > * {
    transition: transform 0.1s linear;
  }

  &:hover > * {
    transition: transform 0.17s cubic-bezier(0.8, 2, 1, 2.5);
    transform: scale(1.15);
  }
}
</style>
