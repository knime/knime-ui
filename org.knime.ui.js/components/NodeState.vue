<script>
import { mapMutations } from 'vuex';
export default {
    inject: ['nodeId'],
    props: {
        executionState: {
            type: String,
            default: 'null',
            validator: executionState => [
                'null', 'CONFIGURED', 'EXECUTED', 'EXECUTING', 'HALTED', 'IDLE', 'QUEUED'
            ].includes(executionState)
        },
        // progress in percentage
        progress: {
            type: Number,
            default: null
        },
        progressMessage: {
            type: String,
            default: null
        },
        error: {
            type: String,
            default: null
        },
        warning: {
            type: String,
            default: null
        }
    },
    computed: {
        /**
         * sets the different lights of the traffic light
         * @returns {[boolean, boolean, boolean] | undefined}
         * @example [true, false, false] means [red: on, yellow: off, green: off]
         * @example 'undefined' means no traffic light should be shown
         */
        trafficLight() {
            return {
                IDLE: [true, false, false],
                CONFIGURED: [false, true, false],
                EXECUTED: [false, false, true],
                HALTED: [false, false, true], // TODO NXT-279: for now halted is the same state as executed
                null: [false, false, false]
            }[this.executionState];
        },
        progressBarWidth() {
            return this.$shapes.nodeSize * this.progress / 100;
        },
        percentageClipPath() {
            return `view-box polygon(0 0, ${this.progressBarWidth} 0, ` +
             `${this.progressBarWidth} ${this.$shapes.nodeStatusHeight}, 0 ${this.$shapes.nodeStatusHeight})`;
        },
        tooltip() {
            const errorSymbolRadius = 5;
            const tooltipSpacing = 2;
            const { nodeSize, nodeStatusHeight, nodeStatusMarginTop } = this.$shapes;
            let tooltip = {
                x: nodeSize / 2,
                y: nodeSize + nodeStatusMarginTop + nodeStatusHeight + errorSymbolRadius + tooltipSpacing,
                anchor: this.nodeId
            };

            if (this.error) {
                return { ...tooltip, text: this.error, type: 'error' };
            } else if (this.warning) {
                return { ...tooltip, text: this.warning, type: 'warning' };
            } else if (this.progressMessage) {
                return { ...tooltip, text: this.progressMessage };
            }
            return null;
        }
    },
    methods: {
        ...mapMutations('workflows', ['setTooltip']),
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
    :transform="`translate(0, ${$shapes.nodeSize + $shapes.nodeStatusMarginTop})`"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <rect
      :width="$shapes.nodeSize"
      :height="$shapes.nodeStatusHeight"
      :fill="$colors.trafficLight.background"
      rx="1"
    />

    <!-- node's static states -->
    <g v-if="trafficLight">
      <circle
        cx="6"
        cy="6"
        r="4"
        :fill="trafficLight[0] ? $colors.trafficLight.red : $colors.trafficLight.inactive"
      />
      <circle
        cx="6"
        cy="6"
        r="3.5"
        fill="none"
        :stroke="trafficLight[0] ? $colors.darkeningMask : $colors.trafficLight.inactiveBorder"
      />
      <circle
        cx="16"
        cy="6"
        r="4"
        :fill="trafficLight[1] ? $colors.trafficLight.yellow : $colors.trafficLight.inactive"
      />
      <circle
        cx="16"
        cy="6"
        r="3.5"
        fill="none"
        :stroke="trafficLight[1] ? $colors.darkeningMask : $colors.trafficLight.inactiveBorder"
      />
      <circle
        cx="26"
        cy="6"
        r="4"
        :fill="trafficLight[2] ? $colors.trafficLight.green : $colors.trafficLight.inactive"
      />
      <circle
        cx="26"
        cy="6"
        r="3.5"
        fill="none"
        :stroke="trafficLight[2] ? $colors.darkeningMask : $colors.trafficLight.inactiveBorder"
      />
    </g>
    <text
      v-else-if="executionState === 'QUEUED'"
      class="progress-text"
      :x="$shapes.nodeSize / 2"
      :fill="$colors.text.default"
      text-anchor="middle"
      y="8.5"
    >
      queued
    </text>

    <!-- node's animated execution state -->
    <g
      v-else-if="executionState === 'EXECUTING'"
    >
      <circle
        v-if="!progress"
        class="progress-circle"
        r="4"
        :cy="$shapes.nodeStatusHeight / 2"
        :fill="$colors.nodeProgressBar"
      />

      <!-- progress bar with text -->
      <g v-else>
        <text
          class="progress-text"
          :fill="$colors.text.default"
          :x="$shapes.nodeSize / 2"
          text-anchor="middle"
          y="8.5"
        >
          {{ progress }}%
        </text>
        <rect
          :height="$shapes.nodeStatusHeight"
          :width="progressBarWidth"
          :fill="$colors.nodeProgressBar"
          rx="1"
        />
        <text
          class="progress-text"
          :x="$shapes.nodeSize / 2"
          :clip-path="percentageClipPath"
          y="8.5"
          fill="white"
          text-anchor="middle"
        >
          {{ progress }}%
        </text>
      </g>
    </g>

    <!-- errors & warnings -->
    <g
      v-if="error"
      class="error"
      :transform="`translate(${$shapes.nodeSize / 2}, ${$shapes.nodeStatusHeight})`"
    >
      <circle
        r="5"
        :fill="$colors.error"
      />
      <line
        x1="-2.25"
        y1="-2.25"
        x2="2.25"
        y2="2.25"
        stroke="white"
      />
      <line
        x1="2.25"
        y1="-2.25"
        x2="-2.25"
        y2="2.25"
        stroke="white"
      />
    </g>
    <g
      v-else-if="warning"
      class="warning"
      :transform="`translate(${$shapes.nodeSize / 2 - 6}, 5.5)`"
    >
      <path
        d="M6,1.25 L0.5,10.75 H11.5 Z"
        :fill="$colors.warning"
        :stroke="$colors.named.Masala"
        stroke-linejoin="round"
      />
      <line
        x1="6"
        x2="6"
        :stroke="$colors.named.Masala"
        y1="4.2"
        y2="7.3"
      />
      <circle
        r="0.5"
        cy="8.75"
        cx="6"
        :fill="$colors.named.Masala"
      />
    </g>
  </g>
</template>

<style lang="postcss" scoped>
.progress-text {
  font-size: 8px;
  line-height: 9px;
}

@keyframes executing {
  from {
    cx: 6px; /* circle radius */
  }

  to {
    cx: 26px; /* node width - circle radius */
  }
}

.progress-circle {
  animation-name: executing;
  animation-duration: 0.8s;
  animation-direction: alternate;
  animation-iteration-count: infinite;
  animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
}
</style>

