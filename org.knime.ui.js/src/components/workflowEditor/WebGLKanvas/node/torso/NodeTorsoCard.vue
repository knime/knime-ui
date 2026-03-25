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
};

const props = withDefaults(defineProps<Props>(), {
  name: null,
  icon: null,
  hasView: false,
  isExecuting: false,
});

const { zoomAwareResolution } = storeToRefs(useWebGLCanvasStore());

const W = $shapes.nodeCardWidth;
const H = computed(() =>
  props.hasView ? $shapes.nodeCardHeight : $shapes.compactNodeCardHeight,
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

// Icon at x=6, 8px wide. Gap: 4px. Name starts at x=18. Right pad: 6px.
const ICON_SIZE = 8;
const NAME_X = 18;
const maxNameChars = Math.floor((W - NAME_X - 6) / 5.5);
const truncatedLabel = computed(() => {
  const label = displayLabel.value;
  return label.length > maxNameChars
    ? `${label.slice(0, maxNameChars - 1)}…`
    : label;
});

// Keep the icon and name in the top header row when the node has an inline view.
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

const cardNameStyle = {
  fontFamily: "Roboto Condensed",
  fontSize: 11,
  fontWeight: "bold",
  fill: "#333333",
};

const renderCard = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.roundRect(0, 0, W, H.value, 6);
  graphics.fill("white");
  graphics.stroke({ width: 1.5, color: categoryColor.value });
};

const renderIconFallback = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.roundRect(6, iconY.value, ICON_SIZE, ICON_SIZE, 1);
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

    <!-- Node icon (8×8) or category color square fallback -->
    <Sprite
      v-if="iconTexture"
      label="NodeTorsoCardIcon"
      event-mode="none"
      :texture="(iconTexture as any)"
      :anchor="0"
      :x="6"
      :y="iconY"
      :scale="iconScale"
    />
    <Graphics
      v-else
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
