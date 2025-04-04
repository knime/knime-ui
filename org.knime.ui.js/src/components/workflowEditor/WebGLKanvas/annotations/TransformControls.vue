<script setup lang="ts">
import { computed, toRefs } from "vue";
import type { FederatedPointerEvent } from "pixi.js";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { DashLine } from "@/util/pixiDashedLine";
import {
  DIRECTIONS,
  type Directions,
} from "../../common/annotations/transform-control-utils";
import { useTransformControls } from "../../common/annotations/useTransformControls";
import { markEventAsHandled } from "../util/interaction";

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
  markEventAsHandled(params.pointerDownEvent, {
    initiator: "annotation-transform",
  });
  startTransform(params);
};

const SELECTION_OFFSET = 2;
const FOCUS_OFFSET = 6;

const transformRectBounds = computed(() => {
  return {
    x: -SELECTION_OFFSET,
    y: -SELECTION_OFFSET,
    width: transformedBounds.value.width + SELECTION_OFFSET * 2,
    height: transformedBounds.value.height + SELECTION_OFFSET * 2,
  };
});

const focusRectBounds = computed(() => {
  return {
    x: -FOCUS_OFFSET,
    y: -FOCUS_OFFSET,
    width: transformedBounds.value.width + FOCUS_OFFSET * 2,
    height: transformedBounds.value.height + FOCUS_OFFSET * 2,
  };
});
</script>

<template>
  <Graphics
    v-if="showFocus"
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
    v-if="showSelection"
    :position="transformRectBounds"
    @render="
      (graphics) => {
        graphics.clear();
        graphics.roundRect(
          0,
          0,
          transformRectBounds.width,
          transformRectBounds.height,
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
    v-for="direction in DIRECTIONS"
    :key="direction"
    event-mode="static"
    :cursor="getCursorStyle(direction).cursor"
    :visible="showTransformControls"
    :x="getControlPosition(transformRectBounds, direction).x"
    :y="getControlPosition(transformRectBounds, direction).y"
    @pointerdown.stop="
      onControlPointerDown({ pointerDownEvent: $event, direction })
    "
    @render="
      (graphics) => {
        graphics.clear();
        graphics.rect(0.5, 0.5, controlSize - 1, controlSize - 1);
        graphics.stroke({ width: 2, color: $colors.White });
        graphics.fill($colors.Cornflower);
      }
    "
  />
</template>
