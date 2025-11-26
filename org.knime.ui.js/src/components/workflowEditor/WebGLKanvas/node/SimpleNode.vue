<script setup lang="ts">
import { XY } from "@/api/gateway-api/generated-api";

defineProps<{
  position: XY;
}>();
</script>

<template>
  <Graphics
    label="Node__root"
    :position="position"
    @render="
      (graphics) => {
        graphics.clear();
        graphics.rect(0, 0, 32, 32);

        graphics.fill('red');
      }
    "
  />
</template>
