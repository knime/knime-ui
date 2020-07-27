<script>
export default {
    props: {
        nodeState: {
            type: Object,
            required: true
        }
    },
    computed: {
        active() {
            // TODO: use actual state with NXT-113
            // for debugging:
            return {
                red: true,
                yellow: true,
                green: true
            };
        }
    }
};
</script>

<template>
  <g>
    <rect
      :y="$shapes.nodeSize+$shapes.nodeStatusMarginTop"
      :width="$shapes.nodeSize"
      :height="$shapes.nodeStatusHeight"
      rx="2"
      fill="#D8DCDD"
    />
    <circle
      :cy="$shapes.nodeSize + $shapes.nodeStatusMarginTop + 6"
      cx="6"
      r="4"
      :fill="active.red ? '#D30D52' : 'white'"
      :stroke="active.red ? '#A90A42' : '#7B7B7B'"
    />
    <circle
      :cy="$shapes.nodeSize + $shapes.nodeStatusMarginTop + 6"
      :cx="$shapes.nodeSize / 2"
      r="4"
      :fill="active.yellow ? '#FFD800' : 'white'"
      :stroke="active.yellow ? '#AB9100' : '#7B7B7B'"
    />
    <circle
      :cy="$shapes.nodeSize + $shapes.nodeStatusMarginTop + 6"
      :cx="$shapes.nodeSize - 2 - 4"
      r="4"
      :fill="active.green ? '#3CB44B' : 'white'"
      :stroke="active.green ? '#007D00' : '#7B7B7B'"
    />
    <!-- PERCENTAGE: TO BE IMPLEMENTED NXT-113
    <div
      v-if="percentage"
      class="percentage"
    >
      <div class="empty"><span>{{ percentage }}%</span></div>
      <div
        class="filled"
        :style="{ width: `${percentage}%` }"
      >
        <span>{{ percentage }}%</span>
      </div>
    </div> -->
  </g>
</template>

