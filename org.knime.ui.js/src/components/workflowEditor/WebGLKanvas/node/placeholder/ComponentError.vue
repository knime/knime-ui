<script setup lang="ts">
import type { Graphics } from "pixi.js";

import CircleCloseFilledIcon from "@knime/styles/img/icons/circle-close_filled.svg?raw";

import * as $shapes from "@/style/shapes";
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
        (graphics: Graphics) => {
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
