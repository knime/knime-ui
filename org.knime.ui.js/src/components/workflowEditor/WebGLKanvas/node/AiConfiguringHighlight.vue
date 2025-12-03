<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";

/**
 * Animated highlight effect for nodes being configured by K-AI in WebGL canvas.
 * Features:
 * - Four-color gradient border (yellow, green, blue, coral) rotating clockwise
 * - Knight-rider style scanning animation inside
 */

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
}

const props = defineProps<Props>();

// Animation state for the scanner and rotating gradient
const scannerOffset = ref(0);
const gradientOffset = ref(0);
let animationId: number | null = null;

const animate = () => {
  scannerOffset.value = (scannerOffset.value + 2) % (props.width * 2);
  gradientOffset.value = (gradientOffset.value + 0.5) % 100;
  animationId = requestAnimationFrame(animate);
};

onMounted(() => {
  animate();
});

onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }
});

// Colors for the gradient (as hex numbers for PixiJS)
const colorValues = [0xffd800, 0x3cb44b, 0x5b9bd5, 0xff4b4b];

// Convert hex to RGB for interpolation
const hexToRgb = (hex: number) => ({
  r: (hex >> 16) & 0xff,
  g: (hex >> 8) & 0xff,
  b: hex & 0xff,
});

// Interpolate between two colors
const lerpColor = (color1: number, color2: number, t: number) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return (r << 16) | (g << 8) | b;
};

// Get color at position along the border (0-1), with rotation offset
const getGradientColor = (position: number, offset: number) => {
  // Add offset for rotation (normalized 0-1)
  const rotatedPosition = (position + offset) % 1;
  const colorIndex = rotatedPosition * colorValues.length;
  const idx = Math.floor(colorIndex);
  const nextIdx = (idx + 1) % colorValues.length;
  const blend = colorIndex - idx;

  return lerpColor(colorValues[idx], colorValues[nextIdx], blend);
};

const borderRadius = $shapes.selectedItemBorderRadius;

// Render the gradient border with rotation
const renderBorder = (graphics: GraphicsInst) => {
  graphics.clear();

  const segments = 48;
  const strokeWidth = 2;

  // Draw border as multiple line segments with gradient colors
  const perimeter = 2 * (props.width + props.height);
  const offset = gradientOffset.value / 100;

  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    const color = getGradientColor(t1, offset);

    const pos1 = getPointOnRect(t1 * perimeter, props.width, props.height);
    const pos2 = getPointOnRect(t2 * perimeter, props.width, props.height);

    graphics.moveTo(props.x + pos1.x, props.y + pos1.y);
    graphics.lineTo(props.x + pos2.x, props.y + pos2.y);
    graphics.stroke({ width: strokeWidth, color });
  }
};

// Get point on rectangle perimeter at distance d from top-left
const getPointOnRect = (
  d: number,
  width: number,
  height: number,
): { x: number; y: number } => {
  const w = width;
  const h = height;

  if (d < w) {
    return { x: d, y: 0 }; // Top edge
  } else if (d < w + h) {
    return { x: w, y: d - w }; // Right edge
  } else if (d < 2 * w + h) {
    return { x: w - (d - w - h), y: h }; // Bottom edge
  } else {
    return { x: 0, y: h - (d - 2 * w - h) }; // Left edge
  }
};

// Render the scanner effect
const renderScanner = (graphics: GraphicsInst) => {
  graphics.clear();

  const scanWidth = props.width * 0.3;
  const scanX = props.x + scannerOffset.value - props.width;

  // Clamp scanner within bounds
  const startX = Math.max(props.x, scanX);
  const endX = Math.min(props.x + props.width, scanX + scanWidth);

  if (endX > startX) {
    // Draw scanner highlight
    graphics.roundRect(
      startX,
      props.y,
      endX - startX,
      props.height,
      borderRadius,
    );
    graphics.fill({ color: 0xffffff, alpha: 0.15 });
  }
};

// Render background
const renderBackground = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.roundRect(props.x, props.y, props.width, props.height, borderRadius);
  graphics.fill({ color: 0xffd800, alpha: 0.05 });
};

// Computed position for the component
const position = computed(() => ({
  x: 0,
  y: $shapes.selectedItemBorderRadius,
}));
</script>

<template>
  <Container label="AiConfiguringHighlight" :position="position">
    <!-- Background -->
    <Graphics label="AiHighlightBackground" @render="renderBackground" />

    <!-- Scanner effect -->
    <Graphics
      label="AiHighlightScanner"
      :key="`scanner-${scannerOffset}`"
      @render="renderScanner"
    />

    <!-- Rotating gradient border -->
    <Graphics
      label="AiHighlightBorder"
      :key="`border-${gradientOffset}`"
      @render="renderBorder"
    />
  </Container>
</template>

