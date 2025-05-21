<script setup lang="ts">
import type { NodePort } from "@/api/gateway-api/generated-api";
import DeleteIcon from "@/assets/delete.svg?raw";
import { useEscapeStack } from "@/composables/useEscapeStack";
import type { ActionButtonConfig } from "../../types";
import ActionBar from "../common/ActionBar.vue";
import { loadSvgInGraphicsContext } from "../util/loadSvgInGraphicsContext";

type Props = {
  port: NodePort;
  direction: "in" | "out";
};

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  "action:remove": [];
}>();

useEscapeStack({
  onEscape() {
    emit("close");
  },
});

const actions: ActionButtonConfig[] = [
  {
    title: "Remove port",
    disabled: !props.port.canRemove,
    icon: loadSvgInGraphicsContext(DeleteIcon),
    onClick: () => {
      emit("action:remove");
    },
    testId: "port-action-remove-port",
  },
];
</script>

<template>
  <Container event-mode="static">
    <ActionBar :actions="actions" />
  </Container>
</template>
