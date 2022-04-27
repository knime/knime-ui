<script>
import PortIcon from '~/webapps-common/ui/components/node/PortIcon';

export default {
    components: {
        PortIcon
    },
    props: {
        /**
         * Port configuration object
         */
        port: {
            type: Object,
            required: true,
            validator: port => (typeof port.inactive === 'boolean' || !port.inactive) && typeof port.typeId === 'string'
        },
        portColor: {
            type: String,
            required: false, // Needed to prevent an exception within `Carousel.vue`
            default: '', // Needed to prevent an exception within `Carousel.vue`
            validator: portColor => typeof portColor === 'string'
        },
        portKind: {
            type: String,
            required: false, // Needed to prevent an exception within `Carousel.vue`
            default: '', // Needed to prevent an exception within `Carousel.vue`
            validator: portKind => typeof ['table', 'flowVariable', 'generic', 'other'].includes(portKind)
        }
    },
    computed: {
        shouldFill() {
            if (this.portKind === 'flowVariable' && this.port.index === 0) {
                // Mickey Mouse ears are always rendered filled, even though they may technically be optional
                return true;
            }
            return !this.port.optional;
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
  <g class="port">
    <rect
      :x="-$shapes.portSize / 2"
      :y="-$shapes.portSize / 2 - 1"
      :width="$shapes.portSize"
      :height="$shapes.portSize + 2"
      class="hover-area"
    />
    <g class="scale">
      <PortIcon
        :type="portKind"
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
  </g>
</template>

<style lang="postcss" scoped>
.port {
  & .hover-area {
    pointer-events: fill;
    fill: none;
    stroke: none;
  }

  & .scale {
    pointer-events: none;
    transition: transform 0.1s linear;
  }

  &:hover .scale {
    transition: transform 0.17s cubic-bezier(0.8, 2, 1, 2.5);
    transform: scale(1.2);
  }
}

</style>
