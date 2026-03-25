<script setup lang="ts">
import { computed } from "vue";
import { BlurFilter } from "pixi.js";

import {
  MetaNodeState,
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";

import NodeTorsoCard from "./NodeTorsoCard.vue";
import NodeTorsoForbidden from "./NodeTorsoForbidden.vue";
import NodeTorsoMetanode from "./NodeTorsoMetanode.vue";
import NodeTorsoMissing from "./NodeTorsoMissing.vue";
import NodeTorsoReplace from "./NodeTorsoReplace.vue";
import { torsoDrawUtils } from "./drawUtils";

type Props = {
  nodeId: string;
  kind: Node.KindEnum;
  icon: string | null;
  type: NativeNodeInvariants.TypeEnum | null;
  isReplacementCandidate: boolean;
  name?: string | null;
  isExecuting?: boolean;
  hasView?: boolean;
  executionState?: MetaNodeState.ExecutionStateEnum;
  isHovered?: boolean;
};

const props = defineProps<Props>();

const isMetanode = computed(() => props.kind === Node.KindEnum.Metanode);

const cardH = computed(() =>
  props.hasView ? $shapes.nodeCardHeight : $shapes.compactNodeCardHeight,
);

const shadowFilter = new BlurFilter({
  strength: 25,
  quality: 12,
  kernelSize: 13,
  legacy: true,
});

const renderCardShadow = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.roundRect(0, 0, $shapes.nodeCardWidth, cardH.value, 6);
  graphics.stroke({ width: 2, color: $colors.GrayDarkSemi });
};

const renderMetanodeShadow = (graphics: GraphicsInst) => {
  graphics.clear();
  torsoDrawUtils.drawDefault(graphics);
  graphics.closePath();
  graphics.stroke({ width: 2, color: $colors.GrayDarkSemi });
};
</script>

<template>
  <Container label="NodeTorso" event-mode="none">
    <Graphics
      label="NodeTorsoShadow"
      event-mode="none"
      :renderable="isHovered"
      :filters="[shadowFilter]"
      @render="isMetanode ? renderMetanodeShadow($event) : renderCardShadow($event)"
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

      <!-- All non-metanode nodes use the compact card design -->
      <NodeTorsoCard
        v-else
        :type="type"
        :kind="kind"
        :icon="icon"
        :name="name"
        :has-view="hasView"
        :is-executing="isExecuting"
      />
    </template>
  </Container>
</template>
