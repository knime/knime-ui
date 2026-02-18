<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { Container, Graphics } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeBackgroundColor } from "../util/nodeBackgroundColor";

type Props = {
  minimapTransform: { scale: XY; translate: XY };
};

defineProps<Props>();

const workflowStore = useWorkflowStore();

const { activeWorkflow } = storeToRefs(workflowStore);

const { getNodeType } = useNodeInteractionsStore();

const backgroundColor = (nodeId: string): string | undefined => {
  const node = activeWorkflow.value?.nodes[nodeId];

  if (!node) {
    // eslint-disable-next-line no-undefined
    return undefined;
  }

  const type = getNodeType(nodeId);
  return nodeBackgroundColor({ kind: node.kind, type });
};
</script>

<template>
  <Container ref="miniPreview" event-mode="none" :interactive-children="false">
    <Graphics
      v-for="annotation of activeWorkflow?.workflowAnnotations"
      :key="annotation.id"
      label="MinimapAnnotation"
      @render="
        (graphics: Graphics) => {
          graphics.clear();
          const width = Math.max(
            3,
            annotation.bounds.width * minimapTransform.scale.x,
          );
          const height = Math.max(
            3,
            annotation.bounds.height * minimapTransform.scale.x,
          );

          graphics.rect(
            (annotation.bounds.x - minimapTransform.translate.x) *
              minimapTransform.scale.x,
            (annotation.bounds.y - minimapTransform.translate.y) *
              minimapTransform.scale.y,
            width,
            height,
          );
          graphics.stroke({ width: 1, color: $colors.SilverSand });
          graphics.fill($colors.White);
        }
      "
    />

    <Graphics
      v-for="node of activeWorkflow?.nodes"
      :key="node.id"
      label="MinimapNode"
      @render="
        (graphics: Graphics) => {
          graphics.clear();
          const nodeSize = Math.max(
            3,
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
