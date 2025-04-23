<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { MetaNodePort, type NodePort } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import * as $colors from "@/style/colors";

import PortIcon from "./PortIcon.vue";

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

const nodeState = computed(() => {
  return "nodeState" in props.port ? props.port.nodeState : undefined; // eslint-disable-line no-undefined
});
</script>

<template>
  <PortIcon
    :type="portKind"
    :color="portColor"
    :filled="shouldFill"
    :targeted="targeted"
    :hovered="hovered"
    :inactive="port.inactive"
    :node-state="nodeState"
  />
</template>
