<script>
export default {
    computed: {
        active() {
            // TODO: use actual state with NXT-113
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
  <g :transform="`translate(0, ${$shapes.nodeSize + $shapes.nodeStatusMarginTop})`">
    <rect
      :width="$shapes.nodeSize"
      :height="$shapes.nodeStatusHeight"
      rx="2"
      fill="#D8DCDD"
    />
    <circle
      cx="6"
      cy="6"
      r="4"
      :fill="active.red ? '#D30D52' : 'white'"
      :stroke="active.red ? '#A90A42' : '#7B7B7B'"
    />
    <circle
      :cx="$shapes.nodeSize / 2"
      cy="6"
      r="4"
      :fill="active.yellow ? '#FFD800' : 'white'"
      :stroke="active.yellow ? '#AB9100' : '#7B7B7B'"
    />
    <circle
      :cx="$shapes.nodeSize - 6"
      cy="6"
      r="4"
      :fill="active.green ? '#3CB44B' : 'white'"
      :stroke="active.green ? '#007D00' : '#7B7B7B'"
    />
  </g>
</template>

