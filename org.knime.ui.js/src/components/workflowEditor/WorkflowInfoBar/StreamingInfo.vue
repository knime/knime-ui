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
  display: flex;
  flex-shrink: 0;
  flex-basis: 80px;
  align-items: center;
  justify-content: flex-end;
  height: 40px;
  margin-right: 10px;
  pointer-events: none;

  & .icon {
    width: 32px;
    margin-right: 5px;
  }
}
</style>
