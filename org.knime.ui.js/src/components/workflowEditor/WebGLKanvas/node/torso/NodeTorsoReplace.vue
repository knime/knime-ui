<script setup lang="ts">
import { type Graphics, GraphicsPath } from "pixi.js";

import * as $colors from "@/style/colors";

import { torsoDrawUtils } from "./drawUtils";

const paths: string[] = [
  "M27.6509 3.23401H20.6509C19.8259 3.23401 19.1509 3.90901 19.1509 4.73401V11.734C19.1509 12.559 19.8259 13.234 20.6509 13.234H27.6509C28.4759 13.234 29.1509 12.559 29.1509 11.734V4.73401C29.1509 3.90901 28.4759 3.23401 27.6509 3.23401Z",
  "M11.6509 18.806H4.65088C3.82588 18.806 3.15088 19.481 3.15088 20.306V27.306C3.15088 28.131 3.82588 28.806 4.65088 28.806H11.6509C12.4759 28.806 13.1509 28.131 13.1509 27.306V20.306C13.1509 19.481 12.4759 18.806 11.6509 18.806Z",
  "M3.59186 19.247L12.7099 28.365",
  "M19.5919 3.67502L28.7099 12.793",
  "M24.1509 16.52V18.745C24.1509 21.52 21.8959 23.77 19.1209 23.77H16.1509",
  "M21.7809 18.4L24.1609 16.02L26.5409 18.4",
];
</script>

<template>
  <Graphics
    @render="
      (graphics: Graphics) => {
        torsoDrawUtils.drawDefault(graphics);
        graphics.fill($colors.SilverSand);
      }
    "
  />

  <Graphics
    v-for="(path, index) in paths"
    :key="index"
    @render="
      (graphics: Graphics) => {
        graphics.path(new GraphicsPath(path));
        graphics.stroke({ color: $colors.Black, cap: 'round' });
      }
    "
  />
</template>
