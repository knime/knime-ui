<script>
/* eslint-disable vue/attribute-hyphenation */
export default {
    props: {
        state: {
            type: String,
            default: null,
            validator: state => ['IDLE', 'CONFIGURED', 'EXECUTED', 'EXECUTING', 'QUEUED', 'HALTED'].includes(state)
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
        trafficLight() {
            return {
                IDLE: 'red',
                CONFIGURED: 'yellow',
                EXECUTED: 'green',
                null: 'white'
            }[this.state];
        }
    }
};
</script>

<template>
  <g :transform="`translate(0, ${$shapes.nodeSize + $shapes.nodeStatusMarginTop})`">
    <rect
      :width="$shapes.nodeSize"
      :height="$shapes.nodeStatusHeight"
      rx="1"
      fill="#D8DCDD"
    />
    
    <!-- NODE'S STATIC STATES -->
    <g v-if="trafficLight">
      <circle
        cx="6"
        cy="6"
        r="3"
        :fill="trafficLight === 'red' ? '#D30D52' : 'white'"
        :stroke="trafficLight === 'red' ? '#A90A42' : '#7B7B7B'"
      />
      <circle
        cx="16"
        cy="6"
        r="3"
        :fill="trafficLight === 'yellow' ? '#FFD800' : 'white'"
        :stroke="trafficLight === 'yellow' ? '#AB9100' : '#7B7B7B'"
      />
      <circle
        cx="26"
        cy="6"
        r="3"
        :fill="trafficLight === 'green' ? '#3CB44B' : 'white'"
        :stroke="trafficLight === 'green' ? '#007D00' : '#7B7B7B'"
      />
    </g>
    <text
      v-else-if="state === 'QUEUED'"
      class="progress-text"
      :x="$shapes.nodeSize / 2"
      :fill="$colors.textColors.default"
      text-anchor="middle"
      y="9"
    >
      queued
    </text>
    
    <!-- NODE'S ANIMATED EXECUTION STATE -->
    <g
      v-else-if="state === 'EXECUTING'"
      class="progress-circle"
    >
      <circle
        v-if="!progress"
        class="progress-circle"
        r="4"
        :cy="$shapes.nodeStatusHeight / 2"
        fill="#1E6DA8"
      >
        <!-- <animateTransform
          attributeName="transform"
          type="translate"
          from="4"
          to="28"
          keySplines=".5 0 .5 1"
          calcMode="spline"
          dur="1.5s"
          repeatCount="indefinite"
        /> -->
      </circle>

      <!-- PROGRESS BAR WITH TEXT -->
      <g v-else>
        <!-- <text
          class="progress-text"
          text-anchor="middle"
          :x="$shapes.nodeSize / 2"
          y="9"
        >
          {{ progress }}%
        </text> -->
        <rect
          :height="$shapes.nodeStatusHeight"
          :width="$shapes.nodeSize * progress/100"
          fill="#1E6DA8"
          rx="1"
        />
        <text
          class="progress-text"
          text-anchor="middle"
          :x="$shapes.nodeSize / 2"
          y="9"
          fill="white"
          clip-path="inset(0,10,0,20)"
        >
          {{ progress }}%
        </text>
      </g>
    </g>
    
    <!-- ERRORS & WARNINGS -->
    <g
      v-if="error"
      :transform="`translate(${$shapes.nodeSize / 2}, ${$shapes.nodeStatusHeight})`"
    >
      <circle
        r="5"
        fill="#D30D52"
      />
      <line
        x1="-2.26"
        y1="-2.26"
        x2="2.26"
        y2="2.26"
        stroke="white"
      />
      <line
        x1="+2.26"
        y1="-2.26"
        x2="-2.26"
        y2="+2.26"
        stroke="white"
      />
    </g>
    <g
      v-else-if="warning"
      :transform="`translate(${$shapes.nodeSize / 2 - 6}, 4)`"
    >
      <path
        d="M5.99982 1.25244L0.518066 10.7474H11.4816L5.99982 1.25244Z"
        fill="#FFD800"
        stroke="#3E3A39"
        stroke-miterlimit="10"
        stroke-linejoin="round"
      />
      <line
        x1="6"
        x2="6"
        stroke="#3E3A39"
        y1="4.2"
        y2="7.3"
      />
      <circle
        r="0.5"
        cy="8.75"
        cx="6"
        fill="#3E3A39"
      />
    </g>
  </g>
</template>

<style scoped>
.progress-text {
  font-size: 8px;
  line-height: 9px;
}

@keyframes move {
  from { cx: 6px; }
  to { cx: 26px; }
}

.progress-circle {
  animation-name: move;
  animation-duration: 0.8s;
  animation-direction: alternate;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
}
</style>

