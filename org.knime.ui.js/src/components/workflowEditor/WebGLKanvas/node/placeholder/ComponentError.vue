<script setup lang="ts">
import CircleCloseFilledIcon from "@knime/styles/img/icons/circle-close_filled.svg?raw";

import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import { loadSvgInGraphicsContext } from "../../util/loadSvgInGraphicsContext";
import { torsoDrawUtils } from "../torso/drawUtils";
</script>

<template>
  <Container label="ComponentPlaceholderError">
    <Graphics
      label="ComponentPlaceholderErrorIcon"
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
      label="ComponentPlaceholderErrorTorso"
      @render="
        (graphics) => {
          graphics.clear();
          torsoDrawUtils.drawDefault(graphics);
          graphics.closePath();
          graphics.stroke({ color: $colors.ErrorRed });
          graphics.fill({ alpha: 0 });
        }
      "
    />
  </Container>
</template>
