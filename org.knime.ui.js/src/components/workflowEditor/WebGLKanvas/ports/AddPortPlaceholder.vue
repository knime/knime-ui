<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, toRefs, useTemplateRef } from "vue";
import { useEventListener } from "@vueuse/core";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";

import type { NodePortGroups } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import { useGlobalBusListener } from "@/composables/useGlobalBusListener";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import {
  type SnappedPlaceholderPort,
  isPlaceholderPort,
} from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import type { ContainerInst } from "@/vue3-pixi";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";
import { useNodeHoverListener } from "../common/useNodeHoverState";
import {
  markEscapeAsHandled,
  markPointerEventAsHandled,
} from "../util/interaction";

import Port from "./Port.vue";
import PortPlaceholderIcon from "./PortPlaceholderIcon.vue";

type Props = {
  position: XY;
  nodeId: string;
  side: "input" | "output";
  portGroups?: NodePortGroups;
  targeted?: boolean;
  selected: boolean;
};

const props = defineProps<Props>();
const emit = defineEmits<{
  addPort: [{ typeId: string; portGroup?: string }];
  deselect: [];
}>();

useEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape" || !props.selected) {
      return;
    }
    markEscapeAsHandled(event, { initiator: "add-port-placeholder::onEscape" });
    emit("deselect");
  },
  { capture: true },
);

const webGLCanvasStore = useWebGLCanvasStore();
const canvasAnchoredComponentsStore = useCanvasAnchoredComponentsStore();
const { portTypeMenu } = storeToRefs(canvasAnchoredComponentsStore);

const isMenuOpenOnParentNode = computed(
  () => portTypeMenu.value.isOpen && portTypeMenu.value.nodeId === props.nodeId,
);
const isMenuOpenOnThisPort = computed(
  () =>
    portTypeMenu.value.isOpen &&
    portTypeMenu.value.nodeId === props.nodeId &&
    portTypeMenu.value.props?.side === props.side,
);

const validPortGroups = computed(() => {
  if (!props.portGroups) {
    return null;
  }

  return (
    Object.entries(props.portGroups)
      .filter(([_, group]) => group.canAddInPort || group.canAddOutPort)
      // map back to an object structure after filtering to match the api object shape
      .reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value }),
        {} as NodePortGroups,
      )
  );
});

// eslint-disable-next-line no-magic-numbers
const direction = computed(() => props.side.slice(0, -3) as "in" | "out");
const snapTarget = ref<SnappedPlaceholderPort>();
useGlobalBusListener({
  eventName: `connector-snap-active-placeholder_${props.nodeId}__${direction.value}`,
  handler: (event) => {
    snapTarget.value = event.snapTarget;
  },
});
useGlobalBusListener({
  eventName: `connector-snap-inactive-placeholder_${props.nodeId}__${direction.value}`,
  handler: () => {
    snapTarget.value = undefined;
  },
});

const selectedPort = computed({
  // use global store state for preview
  get() {
    return portTypeMenu.value.previewPort;
  },
  set(value: any) {
    canvasAnchoredComponentsStore.setPortTypeMenuPreviewPort(value);
  },
});

const previewPort = computed<NodePort | null>(() => {
  // show either the selected port of the menu or the targeted port for drag & drop to this placeholder
  if (snapTarget.value && isPlaceholderPort(snapTarget.value)) {
    return {
      typeId: snapTarget.value.typeId,
      index: -1,
      connectedVia: [],
    } satisfies NodePort;
  }

  if (isMenuOpenOnThisPort.value) {
    return selectedPort.value
      ? ({
          typeId: selectedPort.value.typeId,
          index: -1,
          connectedVia: [],
        } satisfies NodePort)
      : null;
  }

  return null;
});

const container = useTemplateRef<ContainerInst>("container");

// hover animation -> port bounces
const isPlaceholderPortHovered = ref(false);
useAnimatePixiContainer<number>({
  initialValue: 1,
  targetValue: 1.15,
  targetDisplayObject: container,
  changeTracker: computed(() => isPlaceholderPortHovered.value),
  animationParams: { duration: 0.17, ease: [0.8, 2, 1, 2.5] },
  onUpdate: (value) => {
    container.value!.scale.x = value;
    container.value!.scale.y = value;
  },
});

const { singleSelectedNode } = storeToRefs(useSelectionStore());
const isNodeSingleSelected = computed(
  () => singleSelectedNode.value?.id === props.nodeId,
);

const { selected } = toRefs(props);
// node hover area enter animation -> port appears
const isNodeHovered = ref(false);
useAnimatePixiContainer<number>({
  initialValue: 0,
  targetValue: 1,
  targetDisplayObject: container,
  changeTracker: computed(
    () =>
      isMenuOpenOnParentNode.value ||
      isNodeHovered.value ||
      isNodeSingleSelected.value ||
      selected.value ||
      isPlaceholderPortHovered.value,
  ),
  animationParams: { duration: 0.17 },
  onUpdate: (value) => {
    container.value!.alpha = value;
  },
  animateOut: true,
});

useNodeHoverListener({
  nodeId: props.nodeId,
  onEnterCallback: () => {
    isNodeHovered.value = true;
  },
  onLeaveCallback: () => {
    isNodeHovered.value = false;
  },
});

const openMenu = (x: number, y: number) => {
  canvasAnchoredComponentsStore.openPortTypeMenu({
    nodeId: props.nodeId,
    props: {
      side: props.side,
      position: { x, y },
      portGroups: validPortGroups.value,
    },
    events: {
      itemActive: (item) => {
        selectedPort.value = item?.port ?? null;
      },
      itemClick: ({ typeId, portGroup }) => {
        emit("addPort", { typeId, portGroup: portGroup ?? undefined });
      },
      menuClose: () => {
        canvasAnchoredComponentsStore.closePortTypeMenu();
      },
    },
  });
};

const addPort = (x: number, y: number) => {
  const portGroups = Object.values(validPortGroups.value ?? {});
  if (portGroups.length === 1) {
    const { supportedPortTypeIds } = portGroups[0];

    if (supportedPortTypeIds?.length === 1) {
      let [typeId] = supportedPortTypeIds;
      emit("addPort", {
        typeId,
        portGroup: Object.keys(validPortGroups.value!)[0],
      });
      return;
    }
  }
  openMenu(x, y);
};

const onPointerdown = (event: FederatedPointerEvent) => {
  markPointerEventAsHandled(event, { initiator: "add-port-placeholder" });
  if (isMenuOpenOnThisPort.value) {
    canvasAnchoredComponentsStore.closePortTypeMenu();
    return;
  }

  const [x, y] = webGLCanvasStore.toCanvasCoordinates([
    event.global.x,
    event.global.y,
  ]);

  addPort(x, y);
};

const onKeydownEnter = () => {
  const containerBounds = container.value!.getBounds();
  const [x, y] = useWebGLCanvasStore().toCanvasCoordinates([
    containerBounds.x + containerBounds.width / 2,
    containerBounds.y + containerBounds.height / 2,
  ]);
  addPort(x, y);
};

defineExpose({ onKeydownEnter });
</script>

<template>
  <Container
    ref="container"
    :label="`AddPortPlaceholder__${side}`"
    event-mode="static"
    :position="position"
    :alpha="0"
    cursor="pointer"
    @pointerenter="isPlaceholderPortHovered = true"
    @pointerleave="isPlaceholderPortHovered = false"
    @pointerdown.stop.prevent="onPointerdown"
  >
    <Port
      v-if="previewPort && previewPort.typeId"
      :key="previewPort.typeId"
      :port="previewPort"
    />
    <PortPlaceholderIcon v-else :selected="selected" />
  </Container>
</template>
