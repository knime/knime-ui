<script>
import { tooltip } from '@/mixins';

export default {
    mixins: [tooltip],
    inject: ['anchorPoint'],
    props: {
        executionState: {
            type: String,
            default: 'null',
            validator: executionState => [
                'null', 'CONFIGURED', 'EXECUTED', 'EXECUTING', 'HALTED', 'IDLE', 'QUEUED'
            ].includes(executionState)
        },
        // progress as a fraction [0-1]
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
        },
        issue: {
            type: String,
            default: null
        },
        resolutions: {
            type: Array,
            default: () => []
        },
        // TODO: NXT-845 validator and/or docs needed
        // TODO: NXT-845 naming state vs status
        loopStatus: {
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
            let result = this.$shapes.nodeSize * this.clippedProgress;
            if (result && result < 1) {
                // fractional pixels just don't look good
                return 1;
            }
            return result;
        },
        percentageClipPath() {
            return `polygon(0 0, ${100 * this.clippedProgress}% 0, ${100 * this.clippedProgress}% 100%, 0 100%)`;
        },
        tooltip() {
            const { nodeSize, nodeStatusHeight, nodeStatusMarginTop } = this.$shapes;
            let tooltip = {
                position: {
                    x: nodeSize / 2,
                    y: nodeSize + nodeStatusMarginTop + nodeStatusHeight
                },
                anchorPoint: this.anchorPoint,
                gap: 10,
                hoverable: true,
                issue: this.issue,
                resolutions: this.resolutions
            };

            if (this.error) {
                return { ...tooltip, text: this.error, type: 'error' };
            } else if (this.warning) {
                return { ...tooltip, text: this.warning, type: 'warning' };
            } else if (this.progressMessage) {
                return { ...tooltip, text: this.progressMessage };
            }
            return null;
        },
        // TODO: NXT-845 docs why is clipping needed?
        clippedProgress() {
            return Math.min(Math.max(this.progress, 0), 1);
        },
        progressDisplayPercentage() {
            return Math.round(100 * this.clippedProgress);
        }
    }
};
</script>

<template>
  <g>
    <rect
      :width="$shapes.nodeSize"
      :height="$shapes.nodeStatusHeight"
      :fill="$colors.trafficLight.background"
      :stroke="$colors.darkeningMask"
      stroke-width=".3"
      rx="1"
    />

    <!-- node's static states -->
    <g v-if="trafficLight">
      <template
        v-for="(active, index) of trafficLight"
        :key="index"
      >
        <circle
          :cx="6 + 10 * index"
          cy="6"
          r="4"
          :class="active ? `traffic-light-${['red', 'yellow', 'green'][index]}` : null"
          :fill="active ? $colors.trafficLight[['red', 'yellow', 'green'][index]] : $colors.trafficLight.inactive"
        />
        <circle
          :cx="6 + 10 * index"
          cy="6"
          r="3.5"
          fill="none"
          :stroke="active ? $colors.darkeningMask : $colors.trafficLight.inactiveBorder"
        />
      </template>
    </g>
    <text
      v-else-if="executionState === 'QUEUED'"
      class="progress-text"
      :x="$shapes.nodeSize / 2"
      :fill="$colors.text.default"
      text-anchor="middle"
      y="8.5"
    >
      {{ loopStatus && loopStatus === 'PAUSED' ? 'paused' : 'queued' }}
    </text>

    <!-- node's animated execution state -->
    <template
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
      <template v-else>
        <text
          class="progress-text progress-bar"
          :fill="$colors.text.default"
          :x="$shapes.nodeSize / 2"
          text-anchor="middle"
          y="8.5"
        >
          {{ progressDisplayPercentage }}%
        </text>
        <rect
          :height="$shapes.nodeStatusHeight"
          :width="progressBarWidth"
          :fill="$colors.nodeProgressBar"
          rx="1"
        />
        <g :clip-path="percentageClipPath">
          <!-- spacer for clip-path  -->
          <rect
            :height="$shapes.nodeStatusHeight"
            :width="$shapes.nodeSize"
            fill="none"
          />
          <text
            class="progress-text"
            :x="$shapes.nodeSize / 2"
            y="8.5"
            fill="white"
            text-anchor="middle"
          >
            {{ progressDisplayPercentage }}%
          </text>
        </g>
      </template>
    </template>

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

