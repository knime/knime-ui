<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

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
  name?: string | null;
  icon?: string | null;
  hasView?: boolean;
  isExecuting?: boolean;
  customWidth?: number;
  customHeight?: number;
};

const props = withDefaults(defineProps<Props>(), {
  name: null,
  icon: null,
  hasView: false,
  isExecuting: false,
  customWidth: undefined,
  customHeight: undefined,
});

const { zoomAwareResolution } = storeToRefs(useWebGLCanvasStore());

const W = computed(() => props.customWidth ?? $shapes.nodeCardWidth);
const H = computed(
  () =>
    props.customHeight ??
    (props.hasView ? $shapes.nodeCardHeight : $shapes.compactNodeCardHeight),
);
const headerHeight = computed(() =>
  props.hasView ? $shapes.compactNodeCardHeight : H.value,
);

const categoryColor = computed(() => {
  if (props.type && Reflect.has($colors.nodeBackgroundColors, props.type)) {
    return $colors.nodeBackgroundColors[
      props.type as keyof typeof $colors.nodeBackgroundColors
    ];
  }
  if (props.kind === "component") return $colors.nodeBackgroundColors.Component;
  return "#aaa";
});

const displayLabel = computed(() => {
  if (props.name) return props.name;
  if (props.kind === "component") return "Component";
  return "Node";
});

// Icon chip (compact nodes): colored background chip behind the icon
const ICON_SIZE = 12;
const CHIP_SIZE = ICON_SIZE; // chip matches icon exactly — no extra padding
const CHIP_X = 4; // card left padding

// Icon at x=4 (CHIP_X), 12px wide. Gap to name: 4px. Name starts at x=20. Right pad: 6px.
const NAME_X = 20;
const maxNameChars = computed(() => Math.floor((W.value - NAME_X - 6) / (props.hasView ? 5.5 : 4.5)));
const truncatedLabel = computed(() => {
  const label = displayLabel.value;
  return label.length > maxNameChars.value
    ? `${label.slice(0, maxNameChars.value - 1)}…`
    : label;
});

// Keep the icon and name in the top header row when the node has an inline view.
const chipY = computed(() => Math.round((headerHeight.value - CHIP_SIZE) / 2));
const iconY = computed(() => Math.round((headerHeight.value - ICON_SIZE) / 2));
const textY = computed(() => Math.round(headerHeight.value / 2));

// Icon texture — loaded via Image to get natural dimensions before creating
// the PIXI texture. This avoids the width/height-before-load issue where
// sprite.width = 8 sets scale = 8/0 = Infinity when texture hasn't loaded yet.
const iconTexture = ref<PIXI.Texture | null>(null);
const iconScale = ref(0);

watch(
  () => props.icon,
  (newIcon) => {
    iconTexture.value?.destroy();
    iconTexture.value = null;
    iconScale.value = 0;

    if (!newIcon) return;

    const img = new window.Image();
    img.src = newIcon;
    img.onload = () => {
      iconScale.value =
        ICON_SIZE / Math.max(img.naturalWidth, img.naturalHeight);

      // Preserve SVG-backed icons as textures instead of rasterizing them into a canvas first.
      iconTexture.value = PIXI.Texture.from(img);
    };
  },
  { immediate: true },
);

onUnmounted(() => {
  iconTexture.value?.destroy();
});

const cardNameStyle = computed(() => ({
  fontFamily: "Roboto Condensed",
  fontSize: props.hasView ? 11 : 9,
  fontWeight: "bold",
  fill: props.hasView ? "#333333" : "#000000",
}));

const renderCard = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.roundRect(0, 0, W.value, H.value, props.hasView ? 6 : 4);
  graphics.fill("white");
  graphics.stroke({ width: props.hasView ? 1.5 : 1, color: categoryColor.value });
};

// For compact nodes: category-colored chip behind the icon
const renderIconChip = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.roundRect(CHIP_X, chipY.value, CHIP_SIZE, CHIP_SIZE, 4);
  graphics.fill(categoryColor.value);
};

// Fallback for view nodes when icon hasn't loaded
const renderIconFallback = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.roundRect(CHIP_X, iconY.value, ICON_SIZE, ICON_SIZE, 4);
  graphics.fill(categoryColor.value);
};
</script>

<template>
  <Container label="NodeTorsoCard" event-mode="none">
    <!-- Card background with category color border -->
    <Graphics
      label="NodeTorsoCardBackground"
      event-mode="none"
      @render="renderCard"
    />

    <!-- Compact nodes: colored chip behind the icon -->
    <Graphics
      v-if="!hasView"
      label="NodeTorsoCardIconChip"
      event-mode="none"
      @render="renderIconChip"
    />

    <!-- Node icon (8×8) — on top of chip for compact, bare for view nodes -->
    <Sprite
      v-if="iconTexture"
      label="NodeTorsoCardIcon"
      event-mode="none"
      :texture="(iconTexture as any)"
      :anchor="0"
      :x="CHIP_X"
      :y="iconY"
      :scale="iconScale"
    />
    <!-- Fallback for view nodes only (compact nodes already show the chip) -->
    <Graphics
      v-else-if="hasView"
      label="NodeTorsoCardIconFallback"
      event-mode="none"
      @render="renderIconFallback"
    />

    <!-- Node name -->
    <Text
      label="NodeTorsoCardName"
      event-mode="none"
      :x="NAME_X"
      :y="textY"
      :anchor="{ x: 0, y: 0.5 }"
      :style="cardNameStyle"
      :resolution="zoomAwareResolution"
    >
      {{ truncatedLabel }}
    </Text>
  </Container>
</template>
