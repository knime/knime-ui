<script>
export default {
    props: {
        state: {
            type: String,
            required: true,
            validator: state => [
                'EXECUTED', 'EXECUTING', 'IDLE'
            ].includes(state)
        }
    }
};
</script>

<template>
  <g>
    <polygon
      v-if="state === 'EXECUTING'"
      :stroke="$colors.metanodeState"
      points="11,11  11,21  14.75,18.5  14.75,21  22.25,16  14.75,11  14.75,13.5"
      fill="transparent"
      stroke-width="2"
    />
    
    <polyline
      v-else-if="state === 'EXECUTED'"
      :stroke="$colors.metanodeState"
      points="8,16  14,21.5  24,10.5"
      fill="transparent"
      stroke-width="2"
      stroke-linejoin="round"
    />
  </g>
</template>
