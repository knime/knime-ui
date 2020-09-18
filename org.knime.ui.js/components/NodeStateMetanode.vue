<script>
export default {
    props: {
        executionState: {
            type: String,
            required: true,
            validator: executionState => [
                'EXECUTED', 'EXECUTING', 'IDLE'
            ].includes(executionState)
        }
    }
};
</script>

<template>
  <g>
    <polygon
      v-if="executionState === 'EXECUTING'"
      :stroke="$colors.metanodeState"
      points="11,11  11,21  14.75,18.5  14.75,21  22.25,16  14.75,11  14.75,13.5"
      fill="transparent"
      stroke-width="2"
    />
    
    <polyline
      v-else-if="executionState === 'EXECUTED'"
      :stroke="$colors.metanodeState"
      points="8,16  14,21.5  24,10.5"
      fill="transparent"
      stroke-width="2"
      stroke-linejoin="round"
    />
  </g>
</template>
