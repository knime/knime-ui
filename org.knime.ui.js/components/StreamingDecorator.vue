<script>
/**
 * An arrow that indicates that the node is in streaming execution,
 * or an "x" to indicate that a non-streamable node is contained in a streaming context.
 * For use inside the Node component.
 */
export default {
    props: {
        executionInfo: {
            type: Object,
            default: null
        }
    },
    computed: {
        streamable() {
            return this.executionInfo ? this.executionInfo.streamable || this.executionInfo.jobManager : false;
        }
    }
};
</script>

<template>
  <path
    v-if="streamable"
    class="streamable"
    d="M0.5,5.5 h1 m2,0 h1 m2,0 h1 M5.80957 2.40625L8.90332 5.5L5.80957 8.59375"
  />
  <path
    v-else
    class="not-streamable"
    d="M2.40625 8.59375L8.59375 2.40625 M2.40625 2.40625L8.59375 8.59375"
  />
</template>

<style scoped>
g > * {
  pointer-events: none;
}

path {
  fill: none;
  stroke: var(--knime-masala);
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
