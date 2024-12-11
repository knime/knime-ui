<script setup lang="ts">
import { computed } from "vue";
import type { Store } from "vuex";

import type { NodePort } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";
import * as $colors from "@/style/colors";

import PortIcon from "./PortIcon.vue";

interface Props {
  port: NodePort;
}

const props = defineProps<Props>();

// TODO: fix store injection
declare let store: Store<RootStoreState>;

const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);

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
</script>

<template>
  <PortIcon :type="portKind" :color="portColor" :filled="shouldFill" />
</template>
