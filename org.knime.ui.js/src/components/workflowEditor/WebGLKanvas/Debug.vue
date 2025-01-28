<script setup lang="ts">
import { computed } from "vue";
import type { Rectangle } from "pixi.js";
import { type GraphicsInst, useStage } from "vue3-pixi";

const stage = useStage();

const stageHitArea = computed(() => stage.value!.hitArea as Rectangle);

const bounds = () => stage.value.getChildByName("contentBounds")?.getBounds();
</script>

<template>
  <container>
    <graphics
      v-if="stage && stageHitArea"
      :position="{ x: stageHitArea.x, y: stageHitArea.y }"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.beginFill(0xf2eecb);
          graphics.drawRect(0, 0, stageHitArea.width, stageHitArea.height);
          graphics.endFill();
        }
      "
    />

    <graphics
      :position="{ x: bounds.x, y: bounds.y }"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.beginFill(0x1099bb);
          graphics.drawRect(0, 0, bounds!.width, bounds!.height);
          graphics.endFill();
        }
      "
    />

    <!-- ORIGIN -->
    <graphics
      :x="0"
      :y="0"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.beginFill(0x000000);
          graphics.drawRect(0, 0, 10, 10);
          graphics.endFill();
        }
      "
    />
  </container>
</template>
