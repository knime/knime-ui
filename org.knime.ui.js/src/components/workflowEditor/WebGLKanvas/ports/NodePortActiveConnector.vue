<script setup lang="ts">
import type { NodePort } from "@/api/gateway-api/generated-api";
import Connector from "../connectors/Connector.vue";

import Port from "./Port.vue";
import type { DragConnector } from "./usePortDragging";

interface Props {
  port?: NodePort;
  dragConnector?: DragConnector;
}
defineProps<Props>();
</script>

<template>
  <Connector v-if="dragConnector" v-bind="dragConnector" />

  <container
    v-if="dragConnector"
    :position="{
      x: dragConnector.absolutePoint[0],
      y: dragConnector.absolutePoint[1],
    }"
    event-mode="none"
  >
    <Port :port="port!" />
  </container>
</template>
