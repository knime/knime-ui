<script setup lang="ts">
import { computed } from "vue";

import type { ConnectorBendpointProps } from "../../types";

const HOVER_AREA_SIZE = 8;

type Props = ConnectorBendpointProps & {
  isDebugModeEnabled?: boolean;
};

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  interactive: true,
  virtual: false,
  isVisible: false,
  isDebugModeEnabled: false,
});

// eslint-disable-next-line no-magic-numbers
const bendpointSize = computed(() => (props.virtual ? 4 : 6));

const translateX = computed(() => props.position.x);
const translateY = computed(() => props.position.y);
</script>

<template>
  <Container label="ConnectorBendpoint">
    <Graphics
      label="ConnectorBendpointHoverArea"
      v-bind="$attrs"
      :event-mode="interactive ? 'static' : 'none'"
      :cursor="isDragging ? 'grabbing' : 'grab'"
      :position-x="translateX"
      :position-y="translateY"
      :pivot="HOVER_AREA_SIZE / 2"
      :alpha="isDebugModeEnabled ? 1 : 0"
      @render="
        (graphics) => {
          graphics.clear();
          graphics.rect(0, 0, HOVER_AREA_SIZE, HOVER_AREA_SIZE);
          graphics.fill($colors.MeadowDark);
        }
      "
    />

    <Graphics
      label="ConnectorBendpointRender"
      event-mode="none"
      :position-x="translateX"
      :position-y="translateY"
      :alpha="isVisible || isSelected ? 1 : 0"
      :pivot="bendpointSize / 2"
      @render="
        (graphics) => {
          graphics.clear();
          graphics.rect(0, 0, bendpointSize, bendpointSize);
          if (virtual) {
            graphics.fill($colors.White);
            graphics.stroke({ width: 1, color: $colors.StoneGray });
          } else {
            graphics.fill(isSelected ? $colors.Cornflower : $colors.StoneGray);
            graphics.stroke({ width: 1, color: $colors.White });
          }
        }
      "
    />
  </Container>
</template>
