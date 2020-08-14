<script>
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
    <g v-if="trafficLight">
      <rect
        :width="$shapes.nodeSize"
        :height="$shapes.nodeStatusHeight"
        rx="1"
        fill="#D8DCDD"
      />
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
  </g>
</template>

