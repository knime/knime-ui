<script lang="ts" setup>
import { computed } from "vue";
import { useStore } from "@/composables/useStore";
import { useEscapeStack } from "@/composables/useEscapeStack";

const store = useStore();
const isExtensionPanelOpen = computed(
  () => store.state.panel.isExtensionPanelOpen,
);

const { useOnEscapeStack } = useEscapeStack();

useOnEscapeStack({
  onEscape() {
    if (store.state.panel.isExtensionPanelOpen) {
      store.dispatch("panel/closeExtensionPanel");
    }
  },
  alwaysActive: true,
});
</script>

<template>
  <PortalTarget
    v-if="isExtensionPanelOpen"
    tag="div"
    name="extension-panel"
    class="extension-panel"
  />
</template>

<style lang="postcss" scoped>
.extension-panel {
  width: 360px;
  background-color: var(--knime-gray-ultra-light);
  position: fixed;
  left: 400px;
  z-index: 2;
  border: solid var(--knime-silver-sand);
  border-width: 0 1px;
  height: calc(var(--app-main-content-height) - var(--app-toolbar-height));

  /* fix height of scroll container */
  & :deep(.scroll-container) {
    height: calc(100% - 34px);
  }
}
</style>
