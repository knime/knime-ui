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

import type { TablePreview } from "../useNodePortPreview";

type Props = {
  type: NativeNodeInvariants.TypeEnum | null;
  kind: Node.KindEnum;
  name?: string | null;
  annotation?: string | null;
  isExecuting?: boolean;
  tablePreview?: TablePreview;
};

const props = withDefaults(defineProps<Props>(), {
  name: null,
  annotation: null,
  isExecuting: false,
  tablePreview: null,
});

const { zoomAwareResolution } = storeToRefs(useWebGLCanvasStore());

const W = $shapes.nodeCardWidth;
const H = $shapes.nodeCardHeight;
const headerHeight = 36;
// Column header area: 2 lines (name + type), each ~10px + padding
const colHeaderHeight = 22;
const rowHeight = 11;

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

const displayLabel = computed(() => {
  if (props.name) return props.name;
  if (props.kind === "component") return "Component";
  return "Node";
});

// Show at most 3 columns and 5 rows to fit the card body
const displayColumns = computed(() =>
  (props.tablePreview?.columns ?? []).slice(0, 3),
);
const displayColumnTypes = computed(() =>
  (props.tablePreview?.columnTypes ?? []).slice(0, 3),
);
const displayRows = computed(() =>
  (props.tablePreview?.rows ?? []).slice(0, 5),
);

// Column x-positions — distribute evenly across card width minus side padding
const colPositions = computed(() => {
  const n = displayColumns.value.length;
  if (n === 0) return [];
  const padLeft = 8;
  const available = W - padLeft * 2;
  const colW = available / n;
  return Array.from({ length: n }, (_, i) => padLeft + i * colW);
});

// Y where annotation starts
const annotationY = headerHeight + 6;
// Y where table starts — after annotation (2 lines × lineHeight 11 + top padding 6 + gap 2)
const tableY = computed(() =>
  props.annotation ? headerHeight + 30 : headerHeight + 6,
);

// Truncate annotation to 2 visible lines
const charsPerLine = Math.floor((W - 16) / 5.5);
const displayAnnotation = computed(() => {
  if (!props.annotation) return null;
  const lines = props.annotation.split("\n");
  const first = lines[0].slice(0, charsPerLine);
  if (lines.length < 2) return first;
  const second = lines[1].slice(0, charsPerLine);
  return `${first}\n${second}`;
});

const hasTable = computed(
  () =>
    !props.isExecuting &&
    props.tablePreview !== null &&
    displayColumns.value.length > 0 &&
    !props.tablePreview?.imageUrl,
);

const hasImage = computed(
  () => !props.isExecuting && !!props.tablePreview?.imageUrl,
);

// Image area: card body below header
const imageBodyPadding = 4;
const imageAreaX = imageBodyPadding;
const imageAreaY = headerHeight + imageBodyPadding;
const imageAreaW = W - imageBodyPadding * 2;
const imageAreaH = H - headerHeight - imageBodyPadding * 2;


/** KNIME-style type icon + short name from a type ID or plain name. */
const typeLabel = (type: string): string => {
  if (!type) return "";
  const lower = type.toLowerCase();
  // Icon prefix matching KNIME's type indicator system
  if (lower.includes("string") || lower.includes("text")) return "T  String";
  if (lower.includes("double") || lower.includes("float")) return ".00  Number (Float)";
  if (lower.includes("long") || lower.includes("integer") || lower.includes("int")) return "#  Integer";
  if (lower.includes("boolean")) return "?  Boolean";
  if (lower.includes("date") || lower.includes("time")) return "⏱  Date";
  if (lower.includes("xml")) return "</>  XML";
  if (lower.includes("binary") || lower.includes("blob")) return "∎  Binary";
  // Generic fallback: strip class path and common suffixes
  const last = type.split(".").pop() ?? type;
  return last.replace(/(Cell|Value|DataType|Type)$/, "");
};

// ── Text styles ──────────────────────────────────────────────────────────────

const cardNameStyle = {
  fontFamily: "Roboto Condensed",
  fontSize: 11,
  fontWeight: "bold",
  fill: "#333333",
};

const annotationBodyStyle = {
  fontFamily: "Roboto Condensed",
  fontSize: 9,
  fontWeight: "normal",
  fill: "#777777",
  wordWrap: true,
  wordWrapWidth: W - 16,
  lineHeight: 11,
};

const colHeaderStyle = {
  fontFamily: "Roboto Condensed",
  fontSize: 9,
  fontWeight: "bold",
  fill: "#333333",
};

const colTypeStyle = {
  fontFamily: "Roboto Condensed",
  fontSize: 8,
  fontWeight: "normal",
  fill: "#999999",
};

const cellStyle = {
  fontFamily: "Roboto Condensed",
  fontSize: 9,
  fontWeight: "normal",
  fill: "#555555",
};

// ── Graphics renderers ───────────────────────────────────────────────────────

const renderCard = (graphics: GraphicsInst) => {
  graphics.clear();

  // Card background + border
  graphics.roundRect(0, 0, W, H, 6);
  graphics.fill("white");
  graphics.stroke({ width: 1, color: 0xd0d0d0 });

  // Category color square — vertically centered with the name text
  graphics.roundRect(8, 14, 8, 8, 1);
  graphics.fill(categoryColor.value);

  // Header divider
  graphics.moveTo(0, headerHeight).lineTo(W, headerHeight);
  graphics.stroke({ width: 1, color: 0xe0e0e0 });

  // Subtle body background
  graphics.rect(0, headerHeight, W, H - headerHeight);
  graphics.fill({ color: 0x000000, alpha: 0.015 });
};

const renderTableLines = (graphics: GraphicsInst) => {
  graphics.clear();
  if (!hasTable.value) return;

  const y = tableY.value;

  // Column header row background
  graphics.rect(0, y, W, colHeaderHeight);
  graphics.fill({ color: 0x000000, alpha: 0.04 });

  // Divider below column headers
  graphics.moveTo(0, y + colHeaderHeight).lineTo(W, y + colHeaderHeight);
  graphics.stroke({ width: 1, color: 0xe0e0e0 });

  // Alternating row shading
  for (let i = 0; i < displayRows.value.length; i++) {
    if (i % 2 === 1) {
      graphics.rect(
        0,
        y + colHeaderHeight + i * rowHeight,
        W,
        rowHeight,
      );
      graphics.fill({ color: 0x000000, alpha: 0.025 });
    }
  }

  // Vertical column dividers
  const positions = colPositions.value;
  for (let i = 1; i < positions.length; i++) {
    const divX = positions[i] - 4;
    graphics
      .moveTo(divX, y)
      .lineTo(
        divX,
        y + colHeaderHeight + displayRows.value.length * rowHeight,
      );
    graphics.stroke({ width: 1, color: 0xe8e8e8 });
  }
};


</script>

<template>
  <Container label="NodeTorsoCard" event-mode="none">
    <!-- Card background, header divider, body background -->
    <Graphics
      label="NodeTorsoCardBackground"
      event-mode="none"
      @render="renderCard"
    />

    <!-- Node name — left-aligned after the category color square -->
    <Text
      label="NodeTorsoCardName"
      event-mode="none"
      :x="22"
      :y="18"
      :anchor="{ x: 0, y: 0.5 }"
      :style="cardNameStyle"
      :resolution="zoomAwareResolution"
    >
      {{ displayLabel }}
    </Text>

    <!-- Annotation / comment — below header divider (max 2 lines) -->
    <Text
      v-if="displayAnnotation && !isExecuting"
      label="NodeTorsoCardAnnotation"
      event-mode="none"
      :x="8"
      :y="annotationY"
      :anchor="{ x: 0, y: 0 }"
      :style="annotationBodyStyle"
      :resolution="zoomAwareResolution"
    >
      {{ displayAnnotation }}
    </Text>

    <!-- Table structure lines (header bar, row stripes, column dividers) -->
    <Graphics
      label="NodeTorsoTableLines"
      event-mode="none"
      @render="renderTableLines"
    />

    <!-- Column headers (name + type on two lines) -->
    <Container
      v-if="hasTable"
      label="NodeTorsoTableHeaders"
      event-mode="none"
      :y="tableY"
    >
      <template v-for="(col, i) in displayColumns" :key="col">
        <Text
          :label="`ColHeader_${i}`"
          event-mode="none"
          :x="colPositions[i]"
          :y="2"
          :anchor="{ x: 0, y: 0 }"
          :style="colHeaderStyle"
          :resolution="zoomAwareResolution"
        >
          {{ col.length > 12 ? `${col.slice(0, 11)}…` : col }}
        </Text>
        <Text
          v-if="displayColumnTypes[i]"
          :label="`ColType_${i}`"
          event-mode="none"
          :x="colPositions[i]"
          :y="12"
          :anchor="{ x: 0, y: 0 }"
          :style="colTypeStyle"
          :resolution="zoomAwareResolution"
        >
          {{ typeLabel(displayColumnTypes[i]) }}
        </Text>
      </template>
    </Container>

    <!-- Data rows -->
    <Container
      v-if="hasTable"
      label="NodeTorsoTableRows"
      event-mode="none"
      :y="tableY + colHeaderHeight"
    >
      <template v-for="(row, ri) in displayRows" :key="ri">
        <Text
          v-for="(cell, ci) in row.slice(0, displayColumns.length)"
          :key="`${ri}-${ci}`"
          :label="`Cell_${ri}_${ci}`"
          event-mode="none"
          :x="colPositions[ci]"
          :y="ri * rowHeight"
          :anchor="{ x: 0, y: 0 }"
          :style="cellStyle"
          :resolution="zoomAwareResolution"
        >
          {{ cell.length > 11 ? `${cell.slice(0, 10)}…` : cell }}
        </Text>
      </template>
    </Container>

    <!-- Image/view output — fills the card body -->
    <Sprite
      v-if="hasImage"
      label="NodeTorsoImage"
      event-mode="none"
      :texture="tablePreview!.imageUrl!"
      :x="imageAreaX"
      :y="imageAreaY"
      :width="imageAreaW"
      :height="imageAreaH"
    />

  </Container>
</template>
