<script setup lang="ts">
import { Button } from "@knime/components";
import PlayIcon from "@knime/styles/img/icons/play.svg";

type Props = {
  message: string;
  buttonLabel?: string;
};
withDefaults(defineProps<Props>(), {
  buttonLabel: "Execute",
});

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <div class="execute-node-action">
    <span>{{ message }}</span>
    <Button class="action-button" primary compact @click="emit('click')">
      <PlayIcon />
      {{ buttonLabel }}
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
  width: 460px;
  height: 110px;
  inset: 0;
  margin: auto;
  background: rgb(255 255 255 / 30%);
  backdrop-filter: blur(10px);
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");

  & span {
    text-align: center;
  }
}

.action-button {
  margin-top: 20px;
}
</style>
