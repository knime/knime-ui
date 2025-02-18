<script setup lang="ts">
import { Graphics } from "pixi.js";

import type { GraphicsInst } from "@/vue3-pixi";
import NodeTorsoForbidden from "../../../common/NodeTorsoForbidden.vue?raw";

const render = (graphics: GraphicsInst) => {
  // TODO: fix stroke-dasharray not working
  graphics.svg(NodeTorsoForbidden.replaceAll("template", "svg"));
};
</script>

<template>
  <Graphics event-mode="none" @render="render" />
</template>
