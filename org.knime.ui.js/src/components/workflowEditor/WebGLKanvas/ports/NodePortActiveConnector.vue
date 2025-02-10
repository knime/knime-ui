<script setup lang="ts">
import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import Connector from "../connectors/Connector.vue";

import Port from "./Port.vue";
import type { DragConnector } from "./usePortDragging";

interface Props {
  port?: NodePort;
  dragConnector?: DragConnector;
  sourcePortPosition?: XY;
}
defineProps<Props>();
</script>

<template>
  <Container>
    <Connector v-if="dragConnector" v-bind="dragConnector" />

    <Container
      v-if="dragConnector && sourcePortPosition"
      :position="sourcePortPosition"
      :pivot="{ x: -$shapes.portSize / 2, y: -$shapes.portSize / 2 }"
      event-mode="none"
    >
      <Port :port="port!" />
    </Container>

    <Container
      v-if="dragConnector"
      :position="{
        x: dragConnector.absolutePoint[0],
        y: dragConnector.absolutePoint[1],
      }"
      event-mode="none"
    >
      <Port :port="port!" />
    </Container>
  </Container>
</template>
