<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { FederatedPointerEvent, Rectangle } from "pixi.js";

import { ComponentPlaceholder, type XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";
import type { GraphicsInst } from "@/vue3-pixi";
import { useObjectInteractions } from "../../common/useObjectInteractions";
import { markEventAsHandled } from "../../util/interaction";
import NodeName from "../nodeName/NodeName.vue";
import { useNodeNameTextMetrics } from "../useNodeNameTextMetrics";

import ComponentError from "./ComponentError.vue";
import ComponentFloatingOptions from "./ComponentFloatingOptions.vue";
import ComponentLoading from "./ComponentLoading.vue";

type Props = {
  id: string;
  position: XY;
  progress?: number;
  state:
    | ComponentPlaceholder.StateEnum.LOADING
    | ComponentPlaceholder.StateEnum.ERROR;
  name?: string;
};

const props = withDefaults(defineProps<Props>(), {
  name: "",
  progress: 0,
});

const { getSelectedComponentPlaceholder } = storeToRefs(useSelectionStore());
const { selectComponentPlaceholder } = useSelectionStore();
const { toggleContextMenu } = useCanvasAnchoredComponentsStore();
const canvasStore = useWebGLCanvasStore();
const {
  visibleArea,
  isDebugModeEnabled: isCanvasDebugEnabled,
  toCanvasCoordinates,
} = storeToRefs(canvasStore);

const isHovering = ref(false);
const isComponentPlaceholderSelected = computed(
  () => props.id === getSelectedComponentPlaceholder.value?.id,
);
const position = computed(() => ({
  x: props.position.x,
  y: props.position.y,
}));
const nodeNamePosition = computed(() => {
  return {
    x: $shapes.nodeSize / 2,
    y: -$shapes.portSize,
  };
});

const { metrics: nodeNameDimensions } = useNodeNameTextMetrics({
  nodeName: computed(() => props.name),
  shortenName: false,
});

const onRightClick = async (event: FederatedPointerEvent) => {
  markEventAsHandled(event, { initiator: "placeholder-ctx-menu" });
  const [x, y] = toCanvasCoordinates.value([event.global.x, event.global.y]);

  canvasStore.setCanvasAnchor({
    isOpen: true,
    anchor: { x, y },
  });

  if (!isComponentPlaceholderSelected.value) {
    await selectComponentPlaceholder(props.id);
  }

  await toggleContextMenu();
};

const { handlePointerInteraction } = useObjectInteractions({
  objectMetadata: { type: "componentPlaceholder", placeholderId: props.id },
  onMoveEnd: () => Promise.resolve({ shouldMove: false }),
});

const renderable = computed(
  () => !geometry.utils.isPointOutsideBounds(position.value, visibleArea.value),
);

// eslint-disable-next-line no-magic-numbers
const placeholderHitArea = computed(() => new Rectangle(-30, -60, 95, 100));

const renderHoverArea = (graphics: GraphicsInst) => {
  graphics.clear();

  graphics.rect(
    placeholderHitArea.value.x,
    placeholderHitArea.value.y,
    placeholderHitArea.value.width,
    placeholderHitArea.value.height,
  );

  if (isCanvasDebugEnabled?.value) {
    // eslint-disable-next-line no-magic-numbers
    graphics.fill(0xf1f1f1);
  }
};
</script>

<template>
  <Container
    event-mode="static"
    :visible="renderable"
    :renderable="renderable"
    :position="position"
    @pointerenter="isHovering = true"
    @pointerleave.self="isHovering = false"
    @pointerdown="handlePointerInteraction"
    @rightclick="onRightClick"
  >
    <Graphics :hit-area="placeholderHitArea" @render="renderHoverArea" />

    <NodeName
      :node-id="id"
      :name="name"
      :full-name="name"
      :is-editable="false"
      :position="nodeNamePosition"
      :metrics="nodeNameDimensions"
    />

    <ComponentLoading
      v-if="state === ComponentPlaceholder.StateEnum.LOADING"
      :progress="progress"
    />

    <ComponentError v-else />

    <ComponentFloatingOptions
      v-if="isHovering"
      :id="id"
      :is-error="state === ComponentPlaceholder.StateEnum.ERROR"
    />
  </Container>
</template>
