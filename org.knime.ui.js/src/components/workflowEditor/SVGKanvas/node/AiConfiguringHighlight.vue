<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

/**
 * Animated highlight effect for nodes being configured by K-AI.
 * Features:
 * - Four-color gradient border (yellow, green, blue, coral) rotating clockwise
 * - Knight-rider style scanning animation inside
 */

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

const props = defineProps<Props>();

// Generate unique IDs for SVG gradients to avoid conflicts
const uniqueId = Math.random().toString(36).substring(2, 9);
const scanGradientId = `ai-scan-gradient-${uniqueId}`;
const clipId = `ai-clip-${uniqueId}`;

// Animation state for rotating gradient
const gradientOffset = ref(0);
let animationId: number | null = null;

const animate = () => {
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

// Colors for the gradient
const colors = ["#FFD800", "#3CB44B", "#5B9BD5", "#FF4B4B"];

// Calculate border segments for the rotating gradient
const borderSegments = computed(() => {
  const { x, y, width, height } = props;
  const perimeter = 2 * (width + height);
  const segments = 48;
  const result = [];

  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;

    // Add offset for rotation (normalized 0-1)
    const offset = gradientOffset.value / 100;
    const colorPos = (t1 + offset) % 1;

    // Get color based on position
    const colorIndex = colorPos * colors.length;
    const idx = Math.floor(colorIndex);
    const nextIdx = (idx + 1) % colors.length;
    const blend = colorIndex - idx;

    const color = lerpColorHex(colors[idx], colors[nextIdx], blend);

    const pos1 = getPointOnRect(t1 * perimeter, width, height);
    const pos2 = getPointOnRect(t2 * perimeter, width, height);

    result.push({
      x1: x + pos1.x,
      y1: y + pos1.y,
      x2: x + pos2.x,
      y2: y + pos2.y,
      color,
    });
  }

  return result;
});

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

// Interpolate between two hex colors
const lerpColorHex = (hex1: string, hex2: string, t: number): string => {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);

  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
};
</script>

<template>
  <g class="ai-configuring-highlight">
    <!-- Gradient definitions -->
    <defs>
      <!-- Knight-rider scanning gradient -->
      <linearGradient :id="scanGradientId" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="transparent" />
        <stop offset="40%" stop-color="transparent" />
        <stop offset="50%" stop-color="rgba(255, 255, 255, 0.3)" />
        <stop offset="60%" stop-color="transparent" />
        <stop offset="100%" stop-color="transparent" />
      </linearGradient>

      <!-- Clip path for scanner -->
      <clipPath :id="clipId">
        <rect
          :x="props.x"
          :y="props.y"
          :width="props.width"
          :height="props.height"
          :rx="props.borderRadius"
        />
      </clipPath>
    </defs>

    <!-- Semi-transparent background -->
    <rect
      :x="props.x"
      :y="props.y"
      :width="props.width"
      :height="props.height"
      :rx="props.borderRadius"
      fill="rgba(255, 216, 0, 0.05)"
      class="background"
    />

    <!-- Knight-rider scanning effect -->
    <rect
      :x="props.x"
      :y="props.y"
      :width="props.width"
      :height="props.height"
      :clip-path="`url(#${clipId})`"
      :fill="`url(#${scanGradientId})`"
      class="scanner"
    >
      <animate
        attributeName="x"
        :from="props.x - props.width"
        :to="props.x + props.width"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>

    <!-- Rotating gradient border - drawn as line segments -->
    <line
      v-for="(segment, index) in borderSegments"
      :key="index"
      :x1="segment.x1"
      :y1="segment.y1"
      :x2="segment.x2"
      :y2="segment.y2"
      :stroke="segment.color"
      stroke-width="2"
      stroke-linecap="round"
    />
  </g>
</template>


