<script setup lang="ts">
interface Props {
  position?: "center" | "right";
}

withDefaults(defineProps<Props>(), {
  position: "center",
});
</script>

<template>
  <div
    class="floating-toolbar"
    :class="`position-${position}`"
    @pointerdown.stop
  >
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.floating-toolbar {
  position: absolute;
  max-height: calc(v-bind("$shapes.floatingCanvasToolsSize") * 1px);
  bottom: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
  display: flex;
  align-items: center;
  background: var(--knime-white);
  border: 1px solid var(--knime-gray-ultra-light);
  border-radius: 8px;
  box-shadow: var(--shadow-elevation-1);
  z-index: v-bind("$zIndices.layerCanvasDecorations");
  padding: var(--space-4);
}

.position-right {
  right: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
}

.position-center {
  left: 50%;
  transform: translateX(-50%);
}
</style>
