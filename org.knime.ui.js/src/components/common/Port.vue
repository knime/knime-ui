<script>
import { mapState } from "vuex";

import { PortIcon } from "@knime/components";

export default {
  components: {
    PortIcon,
  },
  props: {
    /**
     * Port configuration object
     */
    port: {
      type: Object,
      required: true,
      validator: (port) =>
        (typeof port.inactive === "boolean" || !port.inactive) &&
        typeof port.typeId === "string",
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapState("application", { portTypes: "availablePortTypes" }),
    portKind() {
      // port kind has to be fetched from port type map
      return this.portTypes[this.port.typeId].kind;
    },
    portColor() {
      return this.portKind === "other"
        ? // 'other' port types bring their own color
          this.portTypes[this.port.typeId].color
        : // built-in port types have constant colors
          this.$colors.portColors[this.portKind];
    },
    shouldFill() {
      if (this.portKind === "flowVariable" && this.port.index === 0) {
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
        IDLE: "red",
        CONFIGURED: "yellow",
        EXECUTING: "blue",
        QUEUED: "yellow",
        HALTED: "green",
        EXECUTED: "green",
      }[this.port.nodeState];
    },
    outlineX() {
      let offset = 0;

      // trafic light ports and table ports need to offset the outline by 1px to make the port look centered.
      if (this.trafficLight) {
        offset -= 1;
      }

      // the outline for a selected triangle port is shifted by 1px to the left to make the port look centered.
      if (this.portKind === "table") {
        offset -= 1;
      }

      return offset;
    },
  },
};
</script>

<template>
  <g class="port">
    <circle v-if="isSelected" class="port-outline" :cx="outlineX" r="9.5" />
    <rect
      :x="-$shapes.portSize / 2"
      :y="-$shapes.portSize / 2 - 1"
      :width="$shapes.portSize"
      :height="$shapes.portSize + 2"
      class="hover-area"
      data-hide-in-workflow-preview
    />
    <g class="scale">
      <PortIcon :type="portKind" :color="portColor" :filled="shouldFill" />

      <!-- X outline -->
      <path
        v-if="port.inactive"
        stroke-width="3"
        :stroke="$colors.portColors.inactiveOutline"
        :d="`M-${$shapes.portSize / 2},-${$shapes.portSize / 2} l${
          $shapes.portSize
        },${$shapes.portSize}
           m-${$shapes.portSize},0 l${$shapes.portSize},-${$shapes.portSize}`"
      />
      <!-- X -->
      <path
        v-if="port.inactive"
        stroke-width="1.5"
        :stroke="$colors.portColors.inactive"
        :d="`M-${$shapes.portSize / 2},-${$shapes.portSize / 2} l${
          $shapes.portSize
        },${$shapes.portSize}
           m-${$shapes.portSize},0 l${$shapes.portSize},-${$shapes.portSize}`"
      />
      <!-- metanode port traffic light -->
      <g v-if="trafficLight">
        <g transform="translate(-5.5, 0)" fill="none">
          <circle r="3.75" fill="white" />
          <circle r="3" :fill="$colors.trafficLight[trafficLight]" />
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
}

.port-outline {
  fill: white;
  stroke: var(--knime-cornflower-dark);
}
</style>
