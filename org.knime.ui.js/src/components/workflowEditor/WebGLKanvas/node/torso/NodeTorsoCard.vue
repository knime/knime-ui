<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import type {
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";

type Props = {
  type: NativeNodeInvariants.TypeEnum | null;
  kind: Node.KindEnum;
};

const props = defineProps<Props>();

const { zoomAwareResolution } = storeToRefs(useWebGLCanvasStore());

const W = $shapes.nodeCardWidth;
const H = $shapes.nodeCardHeight;
const headerHeight = 44;
const gridRowCount = 4;
const gridColCount = 3;
const gridRowH = (H - headerHeight) / gridRowCount;
const colW = W / gridColCount;
const shadedRows = [0, 2];

const categoryColor = computed(() => {
  if (
    props.type &&
    Reflect.has($colors.nodeBackgroundColors, props.type)
  ) {
    return $colors.nodeBackgroundColors[
      props.type as keyof typeof $colors.nodeBackgroundColors
    ];
  }
  if (props.kind === "component") return $colors.nodeBackgroundColors.Component;
  return "#aaa";
});

const displayName = computed(() => {
  if (props.type) return props.type.toUpperCase();
  if (props.kind === "component") return "COMPONENT";
  return "NODE";
});

const cardNameStyle = {
  fontFamily: "Roboto Condensed",
  fontSize: 11,
  fontWeight: "bold",
  fill: "#444444",
  letterSpacing: 0.6,
  align: "center" as const,
};

const renderCard = (graphics: GraphicsInst) => {
  graphics.clear();

  // Card background with border
  graphics.roundRect(0, 0, W, H, 6);
  graphics.fill("white");
  graphics.stroke({ width: 1, color: 0xd0d0d0 });

  // Category dot
  graphics.circle(10, 10, 5);
  graphics.fill(categoryColor.value);

  // Description placeholder line 1
  graphics.moveTo(14, 31).lineTo(W - 44, 31);
  graphics.stroke({ width: 1.5, color: 0xd0d0d0 });

  // Description placeholder line 2
  graphics.moveTo(14, 37).lineTo(W - 74, 37);
  graphics.stroke({ width: 1.5, color: 0xd0d0d0 });

  // Header divider
  graphics.moveTo(0, headerHeight).lineTo(W, headerHeight);
  graphics.stroke({ width: 1, color: 0xe0e0e0 });

  // Zebra shading rows
  for (const row of shadedRows) {
    graphics.rect(0, headerHeight + row * gridRowH, W, gridRowH);
    graphics.fill({ color: 0x000000, alpha: 0.03 });
  }

  // Vertical grid lines
  for (let col = 1; col < gridColCount; col++) {
    graphics.moveTo(col * colW, headerHeight).lineTo(col * colW, H);
    graphics.stroke({ width: 1, color: 0xe8e8e8 });
  }

  // Horizontal grid lines
  for (let row = 1; row < gridRowCount; row++) {
    graphics
      .moveTo(0, headerHeight + row * gridRowH)
      .lineTo(W, headerHeight + row * gridRowH);
    graphics.stroke({ width: 1, color: 0xe8e8e8 });
  }
};
</script>

<template>
  <Container label="NodeTorsoCard" event-mode="none">
    <Graphics
      label="NodeTorsoCardBackground"
      event-mode="none"
      @render="renderCard"
    />
    <Text
      label="NodeTorsoCardName"
      event-mode="none"
      :x="W / 2"
      :y="23"
      :anchor="{ x: 0.5, y: 1 }"
      :style="cardNameStyle"
      :resolution="zoomAwareResolution"
    >
      {{ displayName }}
    </Text>
  </Container>
</template>
