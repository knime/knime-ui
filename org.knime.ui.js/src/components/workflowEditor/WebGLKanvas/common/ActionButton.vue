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
import type { ActionButtonConfig, TooltipDefinition } from "../../types";
import { useTooltip } from "../tooltip/useTooltip";
import { markPointerEventAsHandled } from "../util/interaction";

const buttonRadius = 9;
const buttonStroke = 1;

type Props = ActionButtonConfig & {
  x?: number;
  icon: GraphicsContext;
  title?: string;
};

const props = withDefaults(defineProps<Props>(), {
  x: 0,
  disabled: false,
  primary: false,
  title: "",
});

const onClick = (event: FederatedPointerEvent) => {
  if (!props.disabled) {
    markPointerEventAsHandled(event, { initiator: "action-button" });
    props.onClick();
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
    text: props.title,
  };
});

const { showTooltip, hideTooltip } = useTooltip({
  tooltip,
  element: useTemplateRef<ContainerInst>("tooltipRef"),
});

const onPointerEnter = () => {
  isHovered.value = true;
  showTooltip();
};

const onPointerLeave = () => {
  isHovered.value = false;
  hideTooltip();
};
</script>

<template>
  <Container
    ref="tooltipRef"
    event-mode="static"
    :label="'ActionButton__' + testId"
    :cursor="disabled ? 'default' : 'pointer'"
    :position-x="x"
    :hit-area="hitArea"
    @pointerdown.left.stop="onClick"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
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
