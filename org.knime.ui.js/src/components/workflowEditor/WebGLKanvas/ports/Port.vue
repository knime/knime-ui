<script setup lang="ts">
import { computed, toRefs, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { Container } from "pixi.js";

import type { MetaNodePort, NodePort } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import * as $colors from "@/style/colors";
import type { ContainerInst } from "@/vue3-pixi";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";

import PortIcon from "./PortIcon.vue";
import PortInactiveDecorator from "./PortInactiveDecorator.vue";
import PortTrafficLightDecorator from "./PortTrafficLightDecorator.vue";

interface Props {
  port: NodePort | MetaNodePort;
  targeted?: boolean;
  hovered?: boolean;
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
const { hovered, targeted } = toRefs(props);

/* eslint-disable no-magic-numbers */
useAnimatePixiContainer<number>({
  initialValue: 1,
  targetValue: 1.2,
  targetDisplayObject: portContainer,
  changeTracker: computed(() => hovered.value || targeted.value),
  animationParams: { duration: 0.17, ease: [0.8, 2, 1, 2.5] },
  onUpdate: (value) => {
    portContainer.value!.scale.x = value;
    portContainer.value!.scale.y = value;
  },
});
/* eslint-enable no-magic-numbers */
</script>

<template>
  <Container ref="portContainer">
    <PortIcon :type="portKind" :color="portColor" :filled="shouldFill" />
    <PortInactiveDecorator v-if="port.inactive" :port="port" />
    <PortTrafficLightDecorator
      v-if="'nodeState' in port && port.nodeState"
      :node-state="port.nodeState"
    />
  </Container>
</template>
