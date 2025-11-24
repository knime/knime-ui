<script setup lang="ts">
import { computed } from "vue";
import { BlurFilter } from "pixi.js";
import type { Graphics } from "pixi.js";

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
import NodeTorsoReplace from "./NodeTorsoReplace.vue";
import NodeTorsoUnknown from "./NodeTorsoUnknown.vue";
import { torsoDrawUtils } from "./drawUtils";

type Props = {
  nodeId: string;
  kind: Node.KindEnum;
  icon: string | null;
  type: NativeNodeInvariants.TypeEnum | null;
  isReplacementCandidate: boolean;
  executionState?: MetaNodeState.ExecutionStateEnum;
  isHovered?: boolean;
};

const props = defineProps<Props>();

const isMetanode = computed(() => props.kind === Node.KindEnum.Metanode);

const isKnownNode = computed(() => {
  if (props.kind === Node.KindEnum.Component) {
    return !props.type || Reflect.has($colors.nodeBackgroundColors, props.type);
  }
  return isMetanode.value || (props.type ?? "") in $colors.nodeBackgroundColors;
});

const shadowFilter = new BlurFilter({
  strength: 25,
  quality: 12,
  kernelSize: 13,
});

const renderTorso = (graphics: Graphics) => {
  graphics.clear();
  torsoDrawUtils.drawDefault(graphics);
  graphics.closePath();
  graphics.stroke({ width: 2, color: $colors.GrayDarkSemi });
};
</script>

<template>
  <Container event-mode="none">
    <Graphics
      label="torsoShadow"
      event-mode="none"
      :renderable="isHovered"
      :filters="[shadowFilter]"
      @render="renderTorso($event)"
    />

    <template v-if="isReplacementCandidate">
      <NodeTorsoReplace />
    </template>

    <template v-else>
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
        :node-id="nodeId"
        :type="type"
        :kind="kind"
        :icon="icon"
      />

      <NodeTorsoUnknown v-else />
    </template>
  </Container>
</template>
