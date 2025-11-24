<script setup lang="ts">
import type { Graphics } from "pixi.js";

import NodeTorsoMissing from "../../../common/NodeTorsoMissing.vue?raw";

const renderFn = (graphics: Graphics) => {
  graphics.svg(NodeTorsoMissing.replaceAll("template", "svg"));
};
</script>

<template>
  <Graphics event-mode="none" @effect="renderFn" />
</template>
