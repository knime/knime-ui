<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { Container, Graphics } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeBackgroundColor } from "@/util/nodeUtil";

type Props = {
  minimapTransform: { scale: XY; translate: XY };
};

defineProps<Props>();

const workflowStore = useWorkflowStore();

const { activeWorkflow } = storeToRefs(workflowStore);

const { getNodeType } = useNodeInteractionsStore();

const backgroundColor = (nodeId: string) => {
  const node = activeWorkflow.value?.nodes[nodeId];
  if (!node) {
    return null;
  }
  const type = getNodeType(nodeId);
  return nodeBackgroundColor({ kind: node.kind, type });
};
</script>

<template>
  <Container ref="miniPreview">
    <Graphics
      v-for="node of activeWorkflow?.nodes"
      :key="node.id"
      @render="
        (graphics: Graphics) => {
          graphics.clear();
          const nodeSize = Math.max(
            1,
            $shapes.nodeSize * minimapTransform.scale.x,
          );
          graphics.rect(
            (node.position.x - minimapTransform.translate.x) *
              minimapTransform.scale.x,
            (node.position.y - minimapTransform.translate.y) *
              minimapTransform.scale.y,
            nodeSize,
            nodeSize,
          );
          graphics.fill(backgroundColor(node.id));
        }
      "
    />
  </Container>
</template>
