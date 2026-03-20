<script setup lang="ts">
import type {
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import NodeTorsoForbidden from "../../../common/NodeTorsoForbidden.vue";
import NodeTorsoMissing from "../../../common/NodeTorsoMissing.vue";

import NodeTorsoCard from "./NodeTorsoCard.vue";
import NodeTorsoMetanode from "./NodeTorsoMetanode.vue";
import NodeTorsoReplace from "./NodeTorsoReplace.vue";

/**
 * Main part of the node icon.
 * Metanodes keep the original rounded-square design; all other nodes use the
 * new card layout (NodeTorsoCard).
 * Must be embedded in an <svg> element.
 */
type Props = {
  type?: NativeNodeInvariants.TypeEnum | null;
  kind: Node.KindEnum;
  icon?: string | null;
  name?: string | null;
  annotation?: string | null;
  executionState?: string | null;
  isDraggedOver?: boolean;
};

withDefaults(defineProps<Props>(), {
  type: null,
  icon: null,
  name: null,
  annotation: null,
  executionState: null,
  isDraggedOver: false,
});
</script>

<template>
  <g>
    <NodeTorsoMissing v-if="type === 'Missing'" />
    <NodeTorsoForbidden v-if="type === 'Forbidden'" />
    <NodeTorsoMetanode
      v-else-if="kind === 'metanode'"
      :execution-state="executionState!"
    />
    <!-- All non-metanode nodes use the new card design -->
    <NodeTorsoCard
      v-else
      :type="type"
      :kind="kind"
      :name="name"
      :annotation="annotation"
      :is-dragged-over="isDraggedOver"
    />
    <!-- Not using conditional rendering, DOM modifications will trigger DragLeave event -->
    <NodeTorsoReplace :is-dragged-over="isDraggedOver" />
  </g>
</template>
