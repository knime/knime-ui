<script setup lang="ts">
import { computed, onUnmounted, toRef, watch } from "vue";

import type { NodePort } from "@/api/gateway-api/generated-api";
import Port from "@/components/common/Port.vue";
import type { ConnectionPortDirection } from "@/util/workflow-domain";
import Connector from "../connectors/Connector.vue";

import type { DragConnector } from "./NodePort/types";
import NodePortActiveConnectorDecoration from "./NodePortActiveConnectorDecoration.vue";

/**
 * Component that corresponds to a floating active connector, which is visible
 * when dragging a new connection out from a port
 */

interface Props {
  /**
   * The port that the connection was dragged from
   */
  port?: NodePort | null;
  /**
   * Data needed to draw the connector (e.g coordinates, source or target, etc)
   */
  dragConnector?: DragConnector | null;
  /**
   * Direction of the connection. Depends on whether connection was drawn out of an
   * input or an output port
   */
  direction: ConnectionPortDirection;
  /**
   * Indicates that the connector is representing a connection to a port that already
   * has one, so it's an attempt to replace it. This helps with showing a visual offset
   * on the connector's path to help with visual UX
   */
  showConnectionReplacement?: boolean;
  /**
   * Determines whether the connector was dragged onto a compatible port or not.
   * Dropping on a blank canvas space is deemed an incompatible target
   */
  didDragToCompatibleTarget?: boolean;
  /**
   * Whether this connection is able to trigger a quick action
   */
  disableQuickAction?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  port: null,
  dragConnector: null,
  disableQuickAction: false,
  showConnectionReplacement: false,
  didDragToCompatibleTarget: false,
});

const willPerformQuickAction = computed(
  () => !props.didDragToCompatibleTarget && !props.disableQuickAction,
);

/*
 * only in-Ports replace their current connector if a new one is connected
 * only in-Ports that are connected need to indicate connector replacement
 * the parameter is used for the dragConnector or targeted state
 */
const getNextIndicateReplacementState = (currentState: boolean) => {
  const isConnected = props.port && props.port.connectedVia.length > 0;
  return Boolean(props.direction === "in" && isConnected && currentState);
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

// Update indicate connector replacement when drag connector changes.
// Whether this is due to the connector being added/removed via a drag or
// when shuffling through ports via shortcut, which would generate a new dragConnectors every time
watch(toRef(props, "dragConnector"), (dragConnector) => {
  const hasDragConnector = Boolean(dragConnector);

  // When dragging out of a port that will perform a quick action we want to keep
  // the replacement indication offset. This will eventually be removed when a separate
  // instance of NodePortActiveConnector is destroyed, which will happen when the corresponding
  // quick action is complete
  if (willPerformQuickAction.value && !hasDragConnector) {
    return;
  }
  dispatchIndicateReplacement(
    props.port,
    getNextIndicateReplacementState(hasDragConnector),
  );
});

// indicate connector replacement, if this port is targeted for connection
watch(
  toRef(props, "showConnectionReplacement"),
  (showConnectionReplacement: boolean) => {
    dispatchIndicateReplacement(
      props.port,
      getNextIndicateReplacementState(showConnectionReplacement),
    );
  },
);

// set indicate replacement to false for previous port when the port changes
watch(toRef(props, "port"), (_, oldPort) => {
  dispatchIndicateReplacement(oldPort, false);
});

// when the user cancels the add of an in port we need to clean up the replace indicator state
onUnmounted(() => {
  // avoid unnecessary work for cleaning up indication replacement when drag connector is not
  // visible during unmount
  if (props.dragConnector) {
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

    <NodePortActiveConnectorDecoration
      v-if="willPerformQuickAction"
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
