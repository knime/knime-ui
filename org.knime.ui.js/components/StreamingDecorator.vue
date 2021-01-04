<script>
import StreamingSupportedIcon from '../assets/streamable-node.svg?inline';
import StreamingUnsupportedIcon from '../assets/unstreamable-node.svg?inline';
/**
 * Three arrows that indicate, that the node is in streaming execution
 * For use inside the Node component.
 */
export default {
    components: {
        StreamingSupportedIcon,
        StreamingUnsupportedIcon
    },
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
  <g>
    <StreamingSupportedIcon
      v-if="streamable"
      class="icon"
    />
    <StreamingUnsupportedIcon
      v-if="!streamable"
      class="icon"
    />
  </g>
</template>

<style scoped>
g > * {
  pointer-events: none;
}

.icon {
  stroke-width: 1;
}
</style>
