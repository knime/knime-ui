<script lang="ts" setup>
import { ref } from "vue";
import {
  BlurFilter,
  type FederatedPointerEvent,
  Graphics,
  GraphicsContext,
  Rectangle,
} from "pixi.js";

import * as $colors from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";

type Props = {
  x?: number;
  disabled?: boolean;
  // TODO NXT-3411 implement tooltips
  title?: String | null;
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
    emit("click", event);
  }
};

const isHovered = ref(false);

const shadowFilter = new BlurFilter({ strength: 12 });

const renderPlainCircle = (graphics: GraphicsInst) => {
  // eslint-disable-next-line no-magic-numbers
  return graphics.circle(0, 0, 9);
};

const renderCircle = (graphics: GraphicsInst) => {
  graphics.clear();
  renderPlainCircle(graphics);
  if (props.primary) {
    graphics.fill($colors.Yellow);
    graphics.stroke({ width: 1, color: $colors.Yellow });
  } else if (isHovered.value && !props.disabled) {
    graphics.fill($colors.Masala);
    graphics.stroke({ width: 1, color: $colors.Masala });
  } else {
    graphics.fill($colors.White);
    graphics.stroke({ width: 1, color: $colors.SilverSand });
  }
};

// eslint-disable-next-line no-magic-numbers
const rect = new Rectangle(-12.5, -10, 25, 20);
</script>

<template>
  <Container
    event-mode="static"
    :cursor="disabled ? 'default' : 'pointer'"
    :position-x="x"
    :hit-area="rect"
    @pointerdown.left.stop.prevent="onClick"
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
