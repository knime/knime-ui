<script setup lang="ts">
import { computed } from "vue";

import {
  MetaNodeState,
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";

import NodeTorsoForbidden from "./NodeTorsoForbidden.vue";
import NodeTorsoMetanode from "./NodeTorsoMetanode.vue";
import NodeTorsoMissing from "./NodeTorsoMissing.vue";
import NodeTorsoNormal from "./NodeTorsoNormal.vue";
import NodeTorsoUnknown from "./NodeTorsoUnknown.vue";

type Props = {
  kind: Node.KindEnum;
  icon: string | null;
  type: NativeNodeInvariants.TypeEnum | null;
  executionState?: MetaNodeState.ExecutionStateEnum;
};

const props = defineProps<Props>();

const isMetanode = computed(() => props.kind === Node.KindEnum.Metanode);

const isKnownNode = computed(() => {
  if (props.kind === Node.KindEnum.Component) {
    return !props.type || Reflect.has($colors.nodeBackgroundColors, props.type);
  }
  return isMetanode.value || (props.type ?? "") in $colors.nodeBackgroundColors;
});
</script>

<template>
  <Container event-mode="none">
    <NodeTorsoMissing v-if="type === NativeNodeInvariants.TypeEnum.Missing" />
    <NodeTorsoForbidden
      v-if="type === NativeNodeInvariants.TypeEnum.Forbidden"
    />

    <NodeTorsoMetanode
      v-else-if="isMetanode"
      :execution-state="executionState"
    />

    <NodeTorsoNormal
      v-else-if="isKnownNode"
      :type="type"
      :kind="kind"
      :icon="icon"
    />

    <NodeTorsoUnknown v-else />
  </Container>
</template>
