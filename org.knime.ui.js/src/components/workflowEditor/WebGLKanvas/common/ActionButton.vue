<script lang="ts" setup>
import { computed, ref, useTemplateRef } from "vue";
import {
  BlurFilter,
  type FederatedPointerEvent,
  Graphics,
  GraphicsContext,
  Rectangle,
} from "pixi.js";

import * as $colors from "@/style/colors";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";
import { useTooltip } from "../../common/useTooltip";
import type { TooltipDefinition } from "../../types";
import { markEventAsHandled } from "../util/interaction";

const buttonRadius = 9;
const buttonStroke = 1;

type Props = {
  x?: number;
  disabled?: boolean;
  title?: string | null;
  primary?: boolean;
  icon: GraphicsContext;
};

const props = withDefaults(defineProps<Props>(), {
  x: 0,
  disabled: false,
  title: null,
  primary: false,
});

const emit = defineEmits<{
  click: [event: FederatedPointerEvent];
}>();

const onClick = (event: FederatedPointerEvent) => {
  if (!props.disabled) {
    markEventAsHandled(event, { initiator: "action-button" });
    emit("click", event);
  }
};

const isHovered = ref(false);

const shadowFilter = new BlurFilter({ strength: 12 });

const renderPlainCircle = (graphics: GraphicsInst) => {
  return graphics.circle(0, 0, buttonRadius);
};

const renderCircle = (graphics: GraphicsInst) => {
  graphics.clear();
  renderPlainCircle(graphics);
  if (props.primary) {
    graphics.fill($colors.Yellow);
    graphics.stroke({ width: buttonStroke, color: $colors.Yellow });
  } else if (isHovered.value && !props.disabled) {
    graphics.fill($colors.Masala);
    graphics.stroke({ width: buttonStroke, color: $colors.Masala });
  } else {
    graphics.fill($colors.White);
    graphics.stroke({ width: buttonStroke, color: $colors.SilverSand });
  }
};

// eslint-disable-next-line no-magic-numbers
const hitArea = new Rectangle(-12.5, -10, 25, 20);

const tooltip = computed<TooltipDefinition>(() => {
  return {
    position: {
      x: buttonRadius + buttonStroke,
      y: 0,
    },
    gap: 4,
    orientation: "top",
    text: props.title ?? "",
  };
});

useTooltip({ tooltip, element: useTemplateRef<ContainerInst>("tooltipRef") });
</script>

<template>
  <Container
    ref="tooltipRef"
    event-mode="static"
    label="ActionButton"
    :cursor="disabled ? 'default' : 'pointer'"
    :position-x="x"
    :hit-area="hitArea"
    @pointerdown.left.stop="onClick"
    @pointerenter="isHovered = true"
    @pointerleave="isHovered = false"
  >
    <Graphics
      label="actionButtonShadow"
      :renderable="!disabled"
      :filters="[shadowFilter]"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          renderPlainCircle(graphics);
          graphics.stroke($colors.GrayDarkSemi);
        }
      "
    />
    <Graphics @render="renderCircle" />
    <Graphics
      :width="20"
      :height="20"
      :pivot="16"
      :geometry="icon"
      @render="
        (graphics: GraphicsInst) => {
          if (disabled) {
            graphics.tint = $colors.SilverSand;
          } else if (isHovered) {
            graphics.tint = $colors.White;
          } else {
            graphics.tint = $colors.Masala;
          }
        }
      "
    />
  </Container>
</template>
