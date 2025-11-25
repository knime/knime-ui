<script setup lang="ts">
import type { GraphicsInst } from "@/vue3-pixi";
import NodeTorsoMissing from "../../../common/NodeTorsoMissing.vue?raw";

const renderFn = (graphics: GraphicsInst) => {
  graphics.svg(NodeTorsoMissing.replaceAll("template", "svg"));
};
</script>

<template>
  <Graphics label="NodeTorsoMissing" event-mode="none" @render="renderFn" />
</template>
