<script setup lang="ts">
import type { KnimeNode } from "@/api/custom-types";
import { isNativeNode } from "@/util/nodeUtil";
import { computed } from "vue";
import PlayIcon from "webapps-common/ui/assets/img/icons/play.svg";
import Button from "webapps-common/ui/components/Button.vue";

type Props = {
  selectedNode: KnimeNode;
};
const props = defineProps<Props>();

const isView = computed(() => {
  if (!isNativeNode(props.selectedNode)) {
    return false;
  }

  return props.selectedNode.hasView;
});

const message = computed(() => {
  const messageTemplate = (kind: string) =>
    `To show the ${kind}, please execute the selected node.`;

  return messageTemplate(isView.value ? "view" : "port output");
});

const emit = defineEmits<{
  executeNode: [];
}>();
</script>

<template>
  <div class="execute-node-action">
    <span>{{ message }}</span>
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
  width: 460px;
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
