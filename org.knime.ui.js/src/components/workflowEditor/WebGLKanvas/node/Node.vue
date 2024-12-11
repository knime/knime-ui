<script setup lang="ts">
import { computed, onMounted, ref, toRef, unref, watch } from "vue";
import * as PIXI from "pixi.js";
import { type GraphicsInst, useStage } from "vue3-pixi";
import type { Store } from "vuex";

import type { KnimeNode } from "@/api/custom-types";
import { NativeNodeInvariants } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";
import * as $colors from "@/style/colors";
import { nodeBackgroundColors } from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { isNodeComponent } from "@/util/nodeUtil";
import { useSelectionPreview } from "../SelectionRectangle/useSelectionPreview";
import NodePorts from "../ports/NodePorts.vue";

import NodeSelectionPlane from "./NodeSelectionPlane.vue";
import { useNodeHoverProvider } from "./useNodeHoverProvider";

const stage = useStage();

// TODO: fix store injection
declare let store: Store<RootStoreState>;

const MIN_MOVE_THRESHOLD = 5;

interface Props {
  node: KnimeNode;
  position: { x: number; y: number };
  icon?: string | null;
  type?: NativeNodeInvariants.TypeEnum | null;
}

const props = withDefaults(defineProps<Props>(), {
  icon: null,
  type: null,
  link: null,
});

const emit = defineEmits<{
  contextmenu: [event: PIXI.FederatedPointerEvent];
}>();

const zoomFactor = computed(() => store.state.canvasWebGL.zoomFactor);
const isNodeSelected = computed(
  () => store.getters["selection/isNodeSelected"],
);
const isWritable = computed(() => store.getters["workflow/isWritable"]);
const isDragging = computed(() => store.state.workflow.isDragging);
const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);
const positionWithDelta = computed(() => ({
  x: props.position.x + movePreviewDelta.value.x,
  y: props.position.y + movePreviewDelta.value.y,
}));

const translatedPosition = computed(() => {
  return isNodeSelected.value(props.node.id)
    ? positionWithDelta.value
    : props.position;
});

watch(
  toRef(props, "position"),
  () => {
    if (isDragging.value) {
      store.dispatch("workflow/resetDragState");
    }
  },
  { deep: true },
);

const startPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

const isEditable = computed(() => {
  if (!isWritable.value) {
    return false;
  }

  return isNodeComponent(props.node) ? !props.node.link : true;
});

const onPointerDown = (pointerDownEvent: PIXI.FederatedPointerEvent) => {
  if (pointerDownEvent.button !== 0) {
    return;
  }

  startPos.value = {
    x: pointerDownEvent.global.x,
    y: pointerDownEvent.global.y,
  };

  const isMultiselect =
    pointerDownEvent.shiftKey ||
    pointerDownEvent.ctrlKey ||
    pointerDownEvent.metaKey;

  if (!isNodeSelected.value(props.node.id) && !isMultiselect) {
    store.dispatch("selection/deselectAllObjects");
    store.dispatch("selection/selectNode", props.node.id);
  }
  if (isMultiselect) {
    if (isNodeSelected.value(props.node.id)) {
      store.dispatch("selection/deselectNode", props.node.id);
    } else {
      store.dispatch("selection/selectNode", props.node.id);
    }
  }

  let didDrag = false;
  store.commit("workflow/setIsDragging", true);

  const onMove = (pointerMoveEvent: PIXI.FederatedPointerEvent): void => {
    const deltaX =
      (pointerMoveEvent.global.x - startPos.value.x) / zoomFactor.value;
    const deltaY =
      (pointerMoveEvent.global.y - startPos.value.y) / zoomFactor.value;

    if (
      Math.abs(deltaX) >= MIN_MOVE_THRESHOLD ||
      Math.abs(deltaY) >= MIN_MOVE_THRESHOLD
    ) {
      didDrag = true;
    }

    store.commit("workflow/setMovePreview", {
      deltaX,
      deltaY,
    });
  };

  const onUp = () => {
    if (!didDrag) {
      if (!isMultiselect && isNodeSelected.value(props.node.id)) {
        store.dispatch("selection/deselectAllObjects");
      }
      store.dispatch("selection/selectNode", props.node.id);
    }

    store.dispatch("workflow/moveObjects");
    stage.value.off("pointermove", onMove);
    stage.value.off("pointerup", onUp);
    stage.value.off("pointerupoutside", onUp);
  };

  stage.value.on("pointermove", onMove);
  stage.value.on("pointerup", onUp);
  stage.value.on("pointerupoutside", onUp);
};

const backgroundColor = computed(() => {
  // In case of unknown type, use Hibiscus Dark
  return props.type ? nodeBackgroundColors[props.type] : $colors.HibiscusDark;
});

const texture = ref<string | PIXI.Texture>();

const NODE_ICON_SIZE = 16;
const scaleFactor = ref(0);

onMounted(() => {
  if (props.icon) {
    const imageLocal = new window.Image();

    imageLocal.src = props.icon;
    imageLocal.onload = () => {
      texture.value = PIXI.Texture.from(props.icon!);
      scaleFactor.value =
        NODE_ICON_SIZE /
        Math.max(imageLocal.naturalWidth, imageLocal.naturalHeight);
    };
  }
});

const { isSelectionPreviewShown } = useSelectionPreview({
  objectId: props.node.id,
  eventNameResolver: () => `node-selection-preview-${props.node.id}`,
  isObjectSelected: unref(isNodeSelected),
});

const { onPointerEnter, onPointerLeave } = useNodeHoverProvider();
</script>

<template>
  <NodeSelectionPlane
    v-if="isSelectionPreviewShown"
    :kind="node.kind"
    :anchor-position="translatedPosition"
  />

  <graphics
    :name="node.id"
    :position="translatedPosition"
    @rightclick="emit('contextmenu', $event)"
    @render="
      (graphics: GraphicsInst) => {
        graphics.clear();
        graphics.beginFill(backgroundColor);
        graphics.drawRoundedRect(0, 0, $shapes.nodeSize, $shapes.nodeSize, 4);
        graphics.endFill();
      }
    "
    @pointerdown="onPointerDown"
    @pointerenter="onPointerEnter(node.id)"
    @pointerleave="onPointerLeave"
  />

  <NodePorts
    :node-id="node.id"
    :node-kind="node.kind"
    :anchor="translatedPosition"
    :in-ports="node.inPorts"
    :out-ports="node.outPorts"
    :is-editable="isEditable"
    :port-groups="null"
  />

  <sprite
    v-if="texture"
    :texture="texture as any"
    :anchor="0.5"
    event-mode="none"
    :scale="scaleFactor"
    :x="translatedPosition.x + $shapes.nodeSize / 2"
    :y="translatedPosition.y + $shapes.nodeSize / 2"
  />
</template>
