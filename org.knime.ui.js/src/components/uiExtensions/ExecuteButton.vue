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
  inset: 0;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 460px;
  height: 110px;
  padding: 20px;
  margin: auto;
  background: rgb(255 255 255 / 30%);
  backdrop-filter: blur(10px);

  & span {
    text-align: center;
  }
}

.action-button {
  margin-top: 20px;
}
</style>
