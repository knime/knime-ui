<script setup lang="ts">
import { computed, onUnmounted, toRef, watch } from "vue";

import type { NodePort } from "@/api/gateway-api/generated-api";
import Port from "@/components/common/Port.vue";
import Connector from "@/components/workflow/connectors/Connector.vue";
import QuickAddNodeGhost from "@/components/workflow/quickActionMenu/quickAdd/QuickAddNodeGhost.vue";
import type { Direction } from "@/util/compatibleConnections";

import type { DragConnector } from "./types";

interface Props {
  port?: NodePort | null;
  dragConnector?: DragConnector | null;
  direction: Direction;
  targeted: boolean;
  didDragToCompatibleTarget: boolean;
  disableQuickNodeAdd: boolean;
  resetReplaceIndicatorStateOnUnmount?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  port: null,
  dragConnector: null,
  resetReplaceIndicatorStateOnUnmount: false,
});

const showAddNodeGhost = computed(
  () => !props.didDragToCompatibleTarget && !props.disableQuickNodeAdd,
);

/*
 * only in-Ports replace their current connector if a new one is connected
 * only in-Ports that are connected need to indicate connector replacement
 * the parameter is used for the dragConnector or targeted state
 */
const checkIndicateReplacement = (state: boolean) => {
  const isConnected = props.port && props.port.connectedVia.length > 0;
  return Boolean(props.direction === "in" && isConnected && state);
};

const dispatchIndicateReplacement = (port: NodePort | null, state: boolean) => {
  if (!port?.connectedVia.length) {
    return;
  }
  const [connectorId] = port.connectedVia;

  const incomingConnector = document.querySelector(
    `[data-connector-id="${connectorId}"]`,
  )!;

  if (!incomingConnector) {
    consola.debug(`incomingConnector with '${connectorId}' not found.`);
    return;
  }

  incomingConnector.dispatchEvent(
    new CustomEvent("indicate-replacement", {
      detail: { state },
    }),
  );
};

// indicate connector replacement, if this port is the starting point of a new connector
watch(toRef(props, "dragConnector"), (dragConnector) => {
  const hasDragConnector = Boolean(dragConnector);

  // keep indication for dragged out quick add ghosts (will be removed on add or cancel of quick add via unmount hook)
  if (showAddNodeGhost.value && !hasDragConnector) {
    return;
  }

  dispatchIndicateReplacement(
    props.port,
    checkIndicateReplacement(hasDragConnector),
  );
});

// indicate connector replacement, if this port is targeted for connection
watch(toRef(props, "targeted"), (targeted: boolean) => {
  dispatchIndicateReplacement(props.port, checkIndicateReplacement(targeted));
});

// quick node adding: set indicate replacement to false for previous port when the port changes
watch(toRef(props, "port"), (_, oldPort) => {
  dispatchIndicateReplacement(oldPort, false);
});

// quick node adding: when the user cancels the add of an in port we need to clean up the replace indicator state
onUnmounted(() => {
  if (props.resetReplaceIndicatorStateOnUnmount) {
    dispatchIndicateReplacement(props.port, false);
  }
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
      :node-relation="direction === 'in' ? 'PREDECESSORS' : 'SUCCESSORS'"
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
