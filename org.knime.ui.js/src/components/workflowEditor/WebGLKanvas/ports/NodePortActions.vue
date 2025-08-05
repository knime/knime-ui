<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

import type { NodePort } from "@/api/gateway-api/generated-api";
import DeleteIcon from "@/assets/delete.svg?raw";
import type { ActionButtonConfig } from "../../types";
import ActionBar from "../common/ActionBar.vue";
import { markEscapeAsHandled } from "../util/interaction";
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

useEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") {
      return;
    }
    markEscapeAsHandled(event, { initiator: "node-port::onEscape" });
    emit("close");
  },
  { capture: true },
);

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
