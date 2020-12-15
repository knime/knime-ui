<script>
import PortIcon from '~/webapps-common/ui/components/node/PortIcon';

export default {
    components: {
        PortIcon
    },
    inheritAttrs: false,
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
        portColor() {
            // Flow Variable Ports and Data Table Ports have constant colors
            // Other port types serve their own color
            return this.$colors.portColors[this.port.type] || this.port.color;
        },
        /**
         * the traffic light of a metanode port displays the state of the inner node that it is connected to
         * @returns {'red' | 'yellow' | 'green' | 'blue' | undefined} traffic light color
         */
        trafficLight() {
            return {
                IDLE: 'red',
                CONFIGURED: 'yellow',
                EXECUTING: 'blue',
                QUEUED: 'yellow',
                HALTED: 'green',
                EXECUTED: 'green'
            }[this.port.nodeState];
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
    class="port"
  >
    <PortIcon
      :type="port.type"
      :color="portColor"
      :filled="shouldFill"
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
          r="3.75"
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
