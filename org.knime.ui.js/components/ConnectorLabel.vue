<script>
import { connectorPosition } from '~/mixins/connectorPosition';

export default {
    mixins: [connectorPosition],
    props: {
        /**
         * Defines the text value of the label
         */
        label: { type: String, default: '' }
    },
    data() {
        return {
            labelWidth: 1000,
            labelHeight: 60,
            offsetY: 16
        };
    },
    computed: {
        /**
         * Find the position between two connectors and add some offset to let the label
         * appear above the connector line
         * @returns {Object} coordinates containing `x` and `y` properties
         */
        halfWayPosition() {
            // Calculates the middle point and subtracts half of the length of the text element
            let halfWay = { x: (this.start[0] + (this.end[0] - this.start[0]) / 2) - this.labelWidth / 2,
                y: (this.start[1] + (this.end[1] - this.start[1]) / 2 - this.offsetY) - this.labelHeight / 2 };
            return halfWay;
        }
    }
};
</script>

<template>
  <foreignObject
    v-if="label.length > 0"
    class="foreignObject"
    :width="labelWidth"
    :height="labelHeight"
    :transform="'translate(' + halfWayPosition.x + ',' + halfWayPosition.y + ')'"
  >
    <p class="textWrapper">
      <span
        class="streamingLabel"
      >
        {{ label }}
      </span>
    </p>
  </foreignObject>
</template>

<style lang="postcss" scoped>

.streamingLabel {
  color: white;
  font-size: 12px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.25);
  border-radius: 2px;
  background-color: var(--knime-masala);
  padding: 5px;
}

.textWrapper {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.foreignObject {
  pointer-events: none;
}
</style>
