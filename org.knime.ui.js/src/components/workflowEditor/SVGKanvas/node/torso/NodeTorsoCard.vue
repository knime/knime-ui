<script setup lang="ts">
/* eslint-disable no-magic-numbers */
import { computed } from "vue";

import type {
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";

type Props = {
  type?: NativeNodeInvariants.TypeEnum | null;
  kind: Node.KindEnum;
  name?: string | null;
  annotation?: string | null;
  isDraggedOver?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  type: null,
  name: null,
  annotation: null,
  isDraggedOver: false,
});

const { nodeCardWidth: W, nodeCardHeight: H } = $shapes;

const headerHeight = 44;
const gridRowCount = 4;
const gridColCount = 3;
const gridRowH = (H - headerHeight) / gridRowCount;
const colW = W / gridColCount;

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

// First line of the annotation, truncated to fit the header width
const annotationLine = computed(() => {
  if (!props.annotation) return "";
  const firstLine = props.annotation.split("\n")[0].trim();
  return firstLine.length > 26 ? `${firstLine.slice(0, 25)}…` : firstLine;
});

// Rows that get the subtle zebra shading
const shadedRows = [0, 2]; // 0-indexed
</script>

<template>
  <!-- Card background -->
  <rect
    :width="W"
    :height="H"
    rx="6"
    fill="white"
    stroke="#d0d0d0"
    stroke-width="1"
  />

  <!-- ── Header zone ─────────────────────────────────────── -->

  <!-- Category color dot — top-left inside the card -->
  <circle cx="10" cy="16" r="4" :fill="categoryColor" />

  <!-- Node name — left-aligned after the color dot -->
  <text
    x="18"
    y="20"
    dominant-baseline="auto"
    class="card-name"
  >
    {{ name || kind.toUpperCase() }}
  </text>

  <!-- Annotation / comment text -->
  <text
    v-if="annotationLine"
    x="10"
    y="36"
    dominant-baseline="auto"
    class="card-annotation"
  >
    {{ annotationLine }}
  </text>

  <!-- Divider -->
  <line
    x1="0"
    :y1="headerHeight"
    :x2="W"
    :y2="headerHeight"
    stroke="#e0e0e0"
    stroke-width="1"
  />

  <!-- ── Grid / content area ────────────────────────────── -->

  <!-- Zebra rows -->
  <rect
    v-for="row in shadedRows"
    :key="row"
    x="0"
    :y="headerHeight + row * gridRowH"
    :width="W"
    :height="gridRowH"
    fill="rgba(0,0,0,0.03)"
  />

  <!-- Vertical column lines -->
  <line
    v-for="col in gridColCount - 1"
    :key="col"
    :x1="col * colW"
    :y1="headerHeight"
    :x2="col * colW"
    :y2="H"
    stroke="#e8e8e8"
    stroke-width="1"
  />

  <!-- Horizontal row lines -->
  <line
    v-for="row in gridRowCount - 1"
    :key="row"
    x1="0"
    :y1="headerHeight + row * gridRowH"
    :x2="W"
    :y2="headerHeight + row * gridRowH"
    stroke="#e8e8e8"
    stroke-width="1"
  />

  <!-- Drag-over overlay -->
  <rect
    v-if="isDraggedOver"
    :width="W"
    :height="H"
    rx="6"
    fill="rgba(100,170,255,0.15)"
    stroke="#4a90d9"
    stroke-width="2"
  />
</template>

<style lang="postcss" scoped>
.card-name {
  font-family: "Roboto Condensed", sans-serif;
  font-size: 11px;
  font-weight: 700;
  fill: #333;
}

.card-annotation {
  font-family: "Roboto Condensed", sans-serif;
  font-size: 9px;
  font-weight: 400;
  fill: #888;
}
</style>
