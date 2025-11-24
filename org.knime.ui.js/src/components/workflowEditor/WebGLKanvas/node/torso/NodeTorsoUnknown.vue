<script setup lang="ts">
import type { Graphics } from "pixi.js";

import NodeTorsoUnknown from "../../../common/NodeTorsoUnknown.vue?raw";

const renderFn = (graphics: Graphics) => {
  graphics.svg(NodeTorsoUnknown.replaceAll("template", "svg"));
};
</script>

<template>
  <Graphics event-mode="none" @effect="renderFn" />
</template>
