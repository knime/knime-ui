<script setup lang="ts">
import type { Graphics } from "pixi.js";

import NodeTorsoForbidden from "../../../common/NodeTorsoForbidden.vue?raw";

const render = (graphics: Graphics) => {
  // TODO: fix stroke-dasharray not working
  graphics.svg(NodeTorsoForbidden.replaceAll("template", "svg"));
};
</script>

<template>
  <Graphics event-mode="none" @effect="render" />
</template>
