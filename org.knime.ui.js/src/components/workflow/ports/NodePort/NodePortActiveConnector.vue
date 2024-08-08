<script setup lang="ts">
import { watch, computed } from "vue";

import type { NodePort } from "@/api/gateway-api/generated-api";

import Port from "@/components/common/Port.vue";
import Connector from "@/components/workflow/connectors/Connector.vue";
import QuickAddNodeGhost from "@/components/workflow/node/quickAdd/QuickAddNodeGhost.vue";
import type { Direction } from "@/util/compatibleConnections";

import type { DragConnector } from "./types";

interface Props {
  port?: NodePort | null;
  dragConnector?: DragConnector | null;
  direction: Direction;
  targeted: boolean;
  didDragToCompatibleTarget: boolean;
  disableQuickNodeAdd: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  port: null,
  dragConnector: null,
});

const showAddNodeGhost = computed(
  () =>
    // props.direction === "out" &&
    !props.didDragToCompatibleTarget && !props.disableQuickNodeAdd,
);

/*
 * only in-Ports replace their current connector if a new one is connected
 * only in-Ports that are connected need to indicate connector replacement
 * indicate, if this port is targeted for connection
 * indicate, if this port is the starting point of a new connector
 */
const indicateConnectorReplacement = computed(() => {
  const isConnected = props.port && props.port.connectedVia.length > 0;

  return (
    props.direction === "in" &&
    isConnected &&
    // either the Port is being targeted or a connection is being
    // drawn out of it
    (props.targeted || Boolean(props.dragConnector))
  );
});

watch(indicateConnectorReplacement, (indicateReplacement) => {
  if (!props.port) {
    return;
  }
  const [incomingConnection] = props.port.connectedVia;
  const incomingConnector = document.querySelector(
    `[data-connector-id="${incomingConnection}"]`,
  )!;

  incomingConnector.dispatchEvent(
    new CustomEvent("indicate-replacement", {
      detail: { state: indicateReplacement },
    }),
  );
});
</script>

<template>
  <Portal v-if="dragConnector" to="drag-connector">
    <Connector
      v-if="port"
      v-bind="dragConnector"
      class="non-interactive"
      :interactive="false"
    />

    <Port
      v-if="port"
      class="non-interactive"
      data-test-id="drag-connector-port"
      :port="port"
      :transform="`translate(${dragConnector.absolutePoint})`"
    />

    <QuickAddNodeGhost
      v-if="showAddNodeGhost"
      class="non-interactive"
      :position="dragConnector.absolutePoint"
      :direction="direction"
    />
  </Portal>
</template>

<style lang="postcss" scoped>
.non-interactive {
  pointer-events: none;

  & :deep(.hover-area) {
    /* overwrite hover-area of ports */
    pointer-events: none !important;
  }
}
</style>
