<script setup lang="ts">
import PlayIcon from "webapps-common/ui/assets/img/icons/play.svg";
import Button from "webapps-common/ui/components/Button.vue";

const emit = defineEmits<{
  executeNode: [];
}>();
</script>

<template>
  <div class="execute-node-action">
    <span>To show the output, please execute the selected node.</span>
    <Button class="action-button" primary compact @click="emit('executeNode')">
      <PlayIcon />
      Execute
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.execute-node-action {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  width: 440px;
  height: 110px;
  inset: 0;
  margin: auto;
  background: rgba(255 255 255 / 30%);
  backdrop-filter: blur(10px);
  z-index: 9;
}

.action-button {
  margin-top: 20px;
}
</style>
