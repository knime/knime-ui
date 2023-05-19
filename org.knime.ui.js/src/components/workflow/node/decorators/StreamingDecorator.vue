<script>
/**
 * An arrow that indicates that the node is in streaming execution,
 * or an "x" to indicate that a non-streamable node is contained in a streaming context.
 * For use inside the Node component.
 */
export default {
  props: {
    /**
     * executionInfo as sent by the backend.
     * For streaming components, this contains { jobManager: { type: 'streaming' }}.
     * For nodes contained in a streaming component, it contains { streamable: <Boolean> }
     * */
    executionInfo: {
      type: Object,
      required: true,
    },
    /**
     * Node type for determining the background color
     * */
    backgroundType: {
      type: String,
      default: null,
    },
  },
  computed: {
    backgroundColor() {
      return this.$colors.nodeBackgroundColors[this.backgroundType];
    },
    /**
     * The streaming decorator should be set either if the node is capable of streaming,
     * or if it is the streaming component itself, hence the type of the jobManager is set to streaming
     * @return {boolean} if true the node supports streaming
     */
    streamable() {
      let { streamable, jobManager } = this.executionInfo;
      return streamable || jobManager?.type === "streaming";
    },
  },
};
</script>

<template>
  <!-- Arrow for streamable nodes, and components with a streaming job manager -->
  <path
    v-if="streamable"
    class="streamable"
    d="M0.5,5.5 h1 m2,0 h1 m2,0 h1 M5.80957 2.40625L8.90332 5.5L5.80957 8.59375"
  />
  <g v-else>
    <!-- Colored Background. This makes sure the X is well visible even if it overlaps with the node icon -->
    <rect
      v-if="backgroundColor"
      width="4"
      height="4"
      x="1"
      y="1"
      rx="1"
      ry="1"
      :fill="backgroundColor"
    />
    <!-- "X" for non-streamable nodes inside a streaming component -->
    <path
      class="not-streamable"
      d="M2.40625 8.59375L8.59375 2.40625 M2.40625 2.40625L8.59375 8.59375"
    />
  </g>
</template>

<style scoped>
* {
  pointer-events: none;
}

path {
  fill: none;
  stroke: var(--knime-masala);
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
