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
  isDraggedOver?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  type: null,
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

const displayName = computed(() => {
  if (props.type) return props.type.toUpperCase();
  if (props.kind === "component") return "COMPONENT";
  if (props.kind === "metanode") return "METANODE";
  return "NODE";
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

  <!-- Category dot — top-left inside the card -->
  <circle cx="10" cy="10" r="5" :fill="categoryColor" />

  <!-- Node name — bold uppercase, centered in header -->
  <text
    :x="W / 2"
    y="23"
    text-anchor="middle"
    dominant-baseline="auto"
    class="card-name"
  >
    {{ displayName }}
  </text>

  <!-- Description placeholder lines -->
  <line
    x1="14"
    y1="31"
    :x2="W - 44"
    y2="31"
    stroke="#d0d0d0"
    stroke-width="1.5"
    stroke-linecap="round"
  />
  <line
    x1="14"
    y1="37"
    :x2="W - 74"
    y2="37"
    stroke="#d0d0d0"
    stroke-width="1.5"
    stroke-linecap="round"
  />

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
  fill: #444;
  letter-spacing: 0.06em;
}
</style>
