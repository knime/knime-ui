<script setup lang="ts">
import type { GraphicsInst } from "@/vue3-pixi";
import NodeTorsoUnknown from "../../../common/NodeTorsoUnknown.vue?raw";

const renderFn = (graphics: GraphicsInst) => {
  graphics.svg(NodeTorsoUnknown.replaceAll("template", "svg"));
};
</script>

<template>
  <Graphics label="NodeTorsoUnknown" event-mode="none" @render="renderFn" />
</template>
