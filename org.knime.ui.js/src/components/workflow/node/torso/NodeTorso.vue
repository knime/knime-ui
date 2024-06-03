<script setup lang="ts">
import { computed } from "vue";
import NodeTorsoNormal from "webapps-common/ui/components/node/NodeTorsoNormal.vue";
import type {
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors.mjs";

import NodeTorsoMissing from "./NodeTorsoMissing.vue";
import NodeTorsoUnknown from "./NodeTorsoUnknown.vue";
import NodeTorsoMetanode from "./NodeTorsoMetanode.vue";
import NodeTorsoReplace from "./NodeTorsoReplace.vue";
import NodeTorsoForbidden from "./NodeTorsoForbidden.vue";

/**
 * Main part of the node icon.
 * Mostly a rounded square (or for some special nodes like loop nodes, a dedicated shape).
 * Must be embedded in an <svg> element.
 */
type Props = {
  type: NativeNodeInvariants.TypeEnum;
  kind: Node.KindEnum;
  icon?: string | null;
  executionState?: string | null;
  isDraggedOver?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  icon: null,
  executionState: null,
  isDraggedOver: false,
});

const isKnownNode = computed(() => {
  if (props.kind === "component") {
    return !props.type || Reflect.has($colors.nodeBackgroundColors, props.type);
  }
  return (
    props.kind === "metanode" ||
    Reflect.has($colors.nodeBackgroundColors, props.type)
  );
});
</script>

<template>
  <g>
    <NodeTorsoMissing v-if="type === 'Missing'" />
    <NodeTorsoForbidden v-if="type === 'Forbidden'" />
    <NodeTorsoMetanode
      v-else-if="kind === 'metanode'"
      :execution-state="executionState"
    />
    <NodeTorsoNormal
      v-else-if="isKnownNode"
      :is-component="kind === 'component'"
      :icon="icon"
      :type="type"
    />
    <NodeTorsoUnknown v-else />
    <!-- Not using conditional rendering, DOM modifications will trigger DragLeave event -->
    <NodeTorsoReplace :is-dragged-over="isDraggedOver" />
  </g>
</template>
