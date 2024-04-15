<script setup lang="ts">
import PlayIcon from "webapps-common/ui/assets/img/icons/play.svg";
import Button from "webapps-common/ui/components/Button.vue";

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
  background: rgba(255 255 255 / 30%);
  backdrop-filter: blur(10px);
  z-index: 9;

  & span {
    text-align: center;
  }
}

.action-button {
  margin-top: 20px;
}
</style>
