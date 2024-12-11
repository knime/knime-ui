<script setup lang="ts">
import StreamingIcon from "@knime/styles/img/icons/nodes-connect.svg";
</script>

<template>
  <span class="streaming-indicator">
    <StreamingIcon class="icon" />
    Streaming
  </span>
</template>

<style lang="postcss" scoped>
.streaming-indicator {
  pointer-events: none;
  display: flex;
  margin-right: 10px;
  height: 40px;
  justify-content: flex-end;
  flex-basis: 80px;
  flex-shrink: 0;
  align-items: center;

  & .icon {
    margin-right: 5px;
    width: 32px;
  }
}
</style>
