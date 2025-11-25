<script setup lang="ts">
import { computed, ref, toRefs, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { Container } from "pixi.js";

import type { MetaNodePort, NodePort } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import * as $colors from "@/style/colors";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";

import PortIcon from "./PortIcon.vue";
import PortInactiveDecorator from "./PortInactiveDecorator.vue";
import PortTrafficLightDecorator from "./PortTrafficLightDecorator.vue";

interface Props {
  port: NodePort | MetaNodePort;
  targeted?: boolean;
  hovered?: boolean;
  selected?: boolean;
}

const props = defineProps<Props>();

const { availablePortTypes } = storeToRefs(useApplicationStore());

const portKind = computed(() => {
  // port kind has to be fetched from port type map
  return availablePortTypes.value[props.port.typeId].kind;
});

const portColor = computed(() => {
  return portKind.value === "other"
    ? // 'other' port types bring their own color
      availablePortTypes.value[props.port.typeId].color ?? ""
    : // built-in port types have constant colors
      $colors.portColors[portKind.value];
});

const shouldFill = computed(() => {
  if (portKind.value === "flowVariable" && props.port.index === 0) {
    // Mickey Mouse ears are always rendered filled, even though they may technically be optional
    return true;
  }
  return !props.port.optional;
});

const portContainer = useTemplateRef<ContainerInst>("portContainer");
const { hovered, targeted, selected } = toRefs(props);

useAnimatePixiContainer<number>({
  initialValue: 1,
  targetValue: 1.2,
  targetDisplayObject: portContainer,
  changeTracker: computed(
    () => (hovered.value || targeted.value) && !selected.value,
  ),
  animationParams: { duration: 0.17, ease: [0.8, 2, 1, 2.5] },
  onUpdate: (value) => {
    if (selected.value) {
      portContainer.value!.scale.x = 1;
      portContainer.value!.scale.y = 1;
    } else {
      portContainer.value!.scale.x = value;
      portContainer.value!.scale.y = value;
    }
  },
});
const animatingSelection = ref<boolean>(false);
const selectionContainer = useTemplateRef<ContainerInst>("selectionContainer");
useAnimatePixiContainer<number>({
  initialValue: 0,
  targetValue: 1,
  targetDisplayObject: selectionContainer,
  animationParams: { duration: 0.5, ease: "easeInOut" },
  changeTracker: computed(() => props.selected),
  onUpdate: (value) => {
    if (selected.value) {
      selectionContainer.value!.alpha = value;
      animatingSelection.value = true;
    } else {
      // delay removing the selection circle when quickly going through ports
      selectionContainer.value!.alpha = 1 - value;
      if (selectionContainer.value!.alpha < 0.5) {
        animatingSelection.value = false;
      }
    }
  },
  animateOut: true,
});

const selectionOffset = () => {
  let offset = 0;
  if (portKind.value === "table") {
    offset -= 1;
  }
  if ("nodeState" in props.port && props.port.nodeState) {
    offset -= 1;
  }

  return offset;
};

/* eslint-disable no-magic-numbers */
const renderSelectionCircle = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics
    .circle(selectionOffset(), 0, 9)
    .stroke({ color: $colors.CornflowerDark, width: 1 });
  graphics.circle(selectionOffset(), 0, 8.5).fill({ color: $colors.White });
};
/* eslint-enable no-magic-numbers */
</script>

<template>
  <Container ref="selectionContainer" label="PortSelection">
    <Graphics
      v-if="selected || animatingSelection"
      label="PortSelectionRing"
      @render="renderSelectionCircle"
    />
  </Container>
  <Container ref="portContainer" label="Port">
    <PortIcon :type="portKind" :color="portColor" :filled="shouldFill" />
    <PortInactiveDecorator v-if="port.inactive" />
    <PortTrafficLightDecorator
      v-if="'nodeState' in port && port.nodeState"
      :node-state="port.nodeState"
    />
  </Container>
</template>
