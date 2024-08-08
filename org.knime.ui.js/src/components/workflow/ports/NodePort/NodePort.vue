<script setup lang="ts">
import { inject, computed } from "vue";
import { useStore } from "vuex";

import { type NodePort, type XY } from "@/api/gateway-api/generated-api";
import type { AvailablePortTypes } from "@/api/custom-types";
import { useTooltip, type TooltipDefinition } from "@/composables/useTooltip";
import * as $shapes from "@/style/shapes";

import { toExtendedPortObject } from "@/util/portDataMapper";

import Port from "@/components/common/Port.vue";
import NodePortActions from "./NodePortActions.vue";
import NodePortActiveConnector from "./NodePortActiveConnector.vue";

import { usePortDragging } from "./usePortDragging";
import { onClickOutside } from "@vueuse/core";

interface Props {
  direction: "in" | "out";
  nodeId: string;
  relativePosition: [number, number];
  port: NodePort;
  targeted?: boolean;
  selected?: boolean;
  disableQuickNodeAdd?: boolean;
}

const store = useStore();

const props = withDefaults(defineProps<Props>(), {
  relativePosition: () => [0, 0],
  selected: false,
  targeted: false,
  disableQuickNodeAdd: false,
});

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
  (e: "click"): void;
  (e: "deselect"): void;
  (e: "remove"): void;
}>();

const anchorPoint = inject<XY>("anchorPoint");

const availablePortTypes = computed<AvailablePortTypes>(
  () => store.state.application.availablePortTypes,
);

const portTemplate = computed(() => {
  const template = toExtendedPortObject(availablePortTypes.value)(
    props.port.typeId,
  );
  if (!template) {
    throw new Error(
      `port template ${props.port.typeId} not available in application`,
    );
  }
  return template;
});

const isFlowVariable = computed(
  () => portTemplate.value.kind === "flowVariable",
);

const tooltip = computed<TooltipDefinition>(() => {
  // table ports have less space than other ports, because the triangular shape naturally creates a gap
  const gap = portTemplate.value.kind === "table" ? 6 : 8; // eslint-disable-line no-magic-numbers
  const { portSize } = $shapes;

  return {
    position: {
      x: props.relativePosition[0],
      y: props.relativePosition[1] - portSize / 2,
    },
    gap,
    anchorPoint: anchorPoint ?? { x: 0, y: 0 },
    title: props.port.name,
    text: props.port.info ?? "",
    orientation: "top",
    hoverable: false,
  } satisfies TooltipDefinition;
});

const openQuickAddNodeMenuAction = (payload: unknown) => {
  store.dispatch("workflow/openQuickAddNodeMenu", payload);
};

const isWritable = computed(() => store.getters["workflow/isWritable"]);

const { elemRef: tooltipRef } = useTooltip({ tooltip });
const {
  didMove,
  didDragToCompatibleTarget,
  dragConnector,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onLostPointerCapture,
} = usePortDragging({
  direction: props.direction,
  isFlowVariable: isFlowVariable.value,
  nodeId: props.nodeId,
  port: props.port,

  onCanvasDrop: () => {
    // ignore drop if quick add menu is disabled (e.g for metanode port bars)
    if (props.disableQuickNodeAdd) {
      return { removeConnector: true };
    }

    const [x, y] = dragConnector.value!.absolutePoint;

    openQuickAddNodeMenuAction({
      props: {
        position: { x, y },
        port: props.port,
        nodeRelation: props.direction === "out" ? "SUCCESSORS" : "PREDECESSORS",
        nodeId: props.nodeId,
      },
    });

    return { removeConnector: true };
  },
});

const onClick = () => {
  if (didMove.value) {
    return;
  }

  emit("click");
};

const onClose = () => {
  if (props.selected) {
    emit("deselect");
  }
};

onClickOutside(tooltipRef, onClose, { capture: false });
</script>

<template>
  <g
    ref="tooltipRef"
    :transform="`translate(${relativePosition})`"
    :class="{ targeted: targeted }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointermove.stop="onPointerMove"
    @lostpointercapture.stop="onLostPointerCapture"
  >
    <!-- regular port shown on the workflow -->
    <Port
      :port="port"
      :class="{ 'hoverable-port': !selected && isWritable }"
      @click="onClick"
    />

    <Portal to="selected-port">
      <Transition name="fade">
        <NodePortActions
          v-if="selected"
          :key="`${nodeId}-${port.index}-${direction}`"
          :port="port"
          :anchor-point="anchorPoint!"
          :relative-position="relativePosition"
          :direction="direction"
          @action:remove="$emit('remove')"
          @close="onClose"
        />
      </Transition>
    </Portal>

    <NodePortActiveConnector
      :port="port"
      :targeted="targeted"
      :direction="direction"
      :drag-connector="dragConnector"
      :did-drag-to-compatible-target="didDragToCompatibleTarget"
      :disable-quick-node-add="disableQuickNodeAdd"
    />
  </g>
</template>

<style lang="postcss" scoped>
.targeted :deep(.scale) {
  transform: scale(1.4);
}

.hoverable-port {
  & :deep(.scale) {
    pointer-events: none;
    transition: transform 0.1s linear;
  }

  &:hover :deep(.scale) {
    transition: transform 0.17s cubic-bezier(0.8, 2, 1, 2.5);
    transform: scale(1.2);
  }
}

:deep(.action-button) {
  transition: all 150ms ease-in;
  transform: scale(1);
}

:deep(.selected-port) {
  transition: opacity 150ms ease-out;
  opacity: 1;
}

.fade-enter-from {
  & :deep(.action-button) {
    opacity: 0;
    transform: scale(0);
  }

  & :deep(.selected-port) {
    opacity: 0;
  }
}

.fade-leave-to {
  & :deep(.action-button) {
    transform: scale(0);
  }

  & :deep(.selected-port) {
    opacity: 0;
  }
}

.fade-leave-active {
  transition: opacity 150ms ease-out;
}
</style>
