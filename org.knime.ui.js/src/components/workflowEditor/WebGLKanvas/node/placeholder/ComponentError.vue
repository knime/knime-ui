<script setup lang="ts">
import CircleCloseFilledIcon from "@knime/styles/img/icons/circle-close_filled.svg?raw";

import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import { loadSvgInGraphicsContext } from "../../util/loadSvgInGraphicsContext";
</script>

<template>
  <Container label="PlaceholderError">
    <Graphics
      :width="16"
      :height="16"
      :x="$shapes.nodeSize / 2 - 8"
      :y="$shapes.nodeSize / 2 - 8"
      :geometry="loadSvgInGraphicsContext(CircleCloseFilledIcon)"
      @render="
        (graphics: GraphicsInst) => {
          graphics.tint = $colors.White;
        }
      "
    />

    <Graphics
      @render="
        (graphics) => {
          graphics.clear();
          graphics.roundRect(
            0,
            0,
            $shapes.nodeSize,
            $shapes.nodeSize,
            $shapes.nodeTorsoRadius,
          );
          graphics.stroke($colors.ErrorRed);
          graphics.fill({ alpha: 0 });
        }
      "
    />
  </Container>
</template>
