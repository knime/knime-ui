<script setup lang="ts">
import { computed, toRefs } from "vue";
import { storeToRefs } from "pinia";
import type { Cursor, FederatedPointerEvent, Graphics } from "pixi.js";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import * as $colors from "@/style/colors";
import { DashLine } from "@/util/pixiDashedLine";
import {
  DIRECTIONS,
  type Directions,
} from "../../common/annotations/transform-control-utils";
import { useTransformControls } from "../../common/annotations/useTransformControls";
import { markPointerEventAsHandled } from "../util/interaction";

type Props = {
  initialValue?: Bounds;
  showTransformControls?: boolean;
  showSelection?: boolean;
  showFocus?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  initialValue: () => ({ x: 0, y: 0, height: 0, width: 0 }),
  showFocus: false,
  showSelection: false,
  showTransformControls: false,
});

const emit = defineEmits<{
  transformStart: [];
  transformEnd: [{ bounds: Bounds }];
  onBoundsChange: [{ bounds: Bounds }];
}>();

const { initialValue, showSelection } = toRefs(props);

const { isDebugModeEnabled: isCanvasDebugEnabled } = storeToRefs(
  useWebGLCanvasStore(),
);

const {
  transformedBounds,
  transformRectStrokeWidth,
  controlSize,
  getControlPosition,
  getCursorStyle,
  startTransform,
} = useTransformControls({
  initialValue,
  onTransformStart: () => emit("transformStart"),
  onTransformChange: (bounds) => emit("onBoundsChange", { bounds }),
  onTransformEnd: (bounds) => emit("transformEnd", { bounds }),
});

const onControlPointerDown = (params: {
  direction: Directions;
  pointerDownEvent: FederatedPointerEvent;
}) => {
  if (!props.showTransformControls) {
    return;
  }

  markPointerEventAsHandled(params.pointerDownEvent, {
    initiator: "annotation-transform",
  });
  startTransform(params);
};

const transformRectBounds = computed(() => {
  return {
    x: -transformRectStrokeWidth.value * 2,
    y: -transformRectStrokeWidth.value * 2,
    width: transformedBounds.value.width + transformRectStrokeWidth.value * 4,
    height: transformedBounds.value.height + transformRectStrokeWidth.value * 4,
  };
});

const FOCUS_OFFSET = 6;
const focusRectBounds = computed(() => {
  return {
    x: -FOCUS_OFFSET,
    y: -FOCUS_OFFSET,
    width: transformedBounds.value.width + FOCUS_OFFSET * 2,
    height: transformedBounds.value.height + FOCUS_OFFSET * 2,
  };
});

type TransformBorder = Bounds & {
  direction: Extract<Directions, "n" | "s" | "w" | "e">;
  debugColor: string;
};

const borders = computed(() => {
  const edgeOffset = props.showTransformControls ? controlSize.value : 0;

  const TransformBorderTop: TransformBorder = {
    direction: "n",
    debugColor: "red",
    x: edgeOffset,
    y: 0,
    width: transformRectBounds.value.width - edgeOffset * 2,
    height: transformRectStrokeWidth.value,
  };

  const TransformBorderBottom: TransformBorder = {
    direction: "s",
    debugColor: "red",
    x: edgeOffset,
    y: transformRectBounds.value.height - transformRectStrokeWidth.value,
    width: transformRectBounds.value.width - edgeOffset * 2,
    height: transformRectStrokeWidth.value,
  };

  const TransformBorderLeft: TransformBorder = {
    direction: "w",
    debugColor: "blue",
    x: 0,
    y: edgeOffset,
    width: transformRectStrokeWidth.value,
    height: transformRectBounds.value.height - edgeOffset * 2,
  };

  const TransformBorderRight: TransformBorder = {
    direction: "e",
    debugColor: "blue",
    x: transformRectBounds.value.width - transformRectStrokeWidth.value,
    y: edgeOffset,
    width: transformRectStrokeWidth.value,
    height: transformRectBounds.value.height - edgeOffset * 2,
  };

  return {
    TransformBorderTop,
    TransformBorderBottom,
    TransformBorderLeft,
    TransformBorderRight,
  };
});

const renderBorder = (graphics: Graphics, border: TransformBorder) => {
  graphics.clear();
  graphics.rect(border.x, border.y, border.width, border.height);

  const color = isCanvasDebugEnabled.value
    ? border.debugColor
    : $colors.kanvasNodeSelection.activeBorder;
  graphics.fill(color);

  // hover area
  graphics.stroke({ width: 2, color: "transparent", cap: "square" });
};

const getBorderCursor = (border: TransformBorder): Cursor => {
  if (!props.showTransformControls) {
    return "auto";
  }
  return getCursorStyle(border.direction).cursor;
};
</script>

<template>
  <Graphics
    v-if="showFocus"
    label="TransformControlsFocus"
    :position="focusRectBounds"
    @render="
      (graphics) => {
        graphics.clear();
        const dash = new DashLine(graphics, { dash: [5, 5] });

        dash.roundRect(
          0,
          0,
          focusRectBounds.width,
          focusRectBounds.height,
          $shapes.selectedItemBorderRadius,
        );

        graphics.stroke({
          width: transformRectStrokeWidth,
          color: $colors.kanvasNodeSelection.activeBorder,
        });
      }
    "
  />

  <Graphics
    label="TransformBorderTop"
    :renderable="showSelection"
    event-mode="static"
    :cursor="getBorderCursor(borders.TransformBorderTop)"
    :position="transformRectBounds"
    @render="(g) => renderBorder(g, borders.TransformBorderTop)"
    @pointerdown.stop="
      onControlPointerDown({
        pointerDownEvent: $event,
        direction: borders.TransformBorderTop.direction,
      })
    "
  />

  <Graphics
    label="TransformBorderBottom"
    :renderable="showSelection"
    event-mode="static"
    :cursor="getBorderCursor(borders.TransformBorderBottom)"
    :position="transformRectBounds"
    @render="(g) => renderBorder(g, borders.TransformBorderBottom)"
    @pointerdown.stop="
      onControlPointerDown({
        pointerDownEvent: $event,
        direction: borders.TransformBorderBottom.direction,
      })
    "
  />

  <Graphics
    label="TransformBorderLeft"
    :renderable="showSelection"
    event-mode="static"
    :cursor="getBorderCursor(borders.TransformBorderLeft)"
    :position="transformRectBounds"
    @render="(g) => renderBorder(g, borders.TransformBorderLeft)"
    @pointerdown.stop="
      onControlPointerDown({
        pointerDownEvent: $event,
        direction: borders.TransformBorderLeft.direction,
      })
    "
  />

  <Graphics
    label="TransformBorderRight"
    :renderable="showSelection"
    event-mode="static"
    :cursor="getBorderCursor(borders.TransformBorderRight)"
    :position="transformRectBounds"
    @render="(g) => renderBorder(g, borders.TransformBorderRight)"
    @pointerdown.stop="
      onControlPointerDown({
        pointerDownEvent: $event,
        direction: borders.TransformBorderRight.direction,
      })
    "
  />

  <Graphics
    v-for="direction in DIRECTIONS"
    :key="direction"
    label="TransformControlPoint"
    event-mode="static"
    :cursor="getCursorStyle(direction).cursor"
    :visible="showTransformControls"
    :position="getControlPosition(transformRectBounds, direction)"
    @pointerdown.stop="
      onControlPointerDown({ pointerDownEvent: $event, direction })
    "
    @render="
      (graphics) => {
        graphics.clear();
        graphics.rect(0, 0, controlSize, controlSize);
        graphics.stroke({ width: 2, color: $colors.White });
        graphics.fill($colors.Cornflower);
      }
    "
  />
</template>
