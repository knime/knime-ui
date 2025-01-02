<script lang="ts" setup>
import { storeToRefs } from "pinia";

import { useEscapeStack } from "@/composables/useEscapeStack";
import { usePanelStore } from "@/store/panel";

const panelStore = usePanelStore();
const { isExtensionPanelOpen } = storeToRefs(panelStore);

useEscapeStack({
  onEscape() {
    if (isExtensionPanelOpen.value) {
      panelStore.closeExtensionPanel();
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
  z-index: v-bind("$zIndices.layerDrawerPanel");
  border: solid var(--knime-silver-sand);
  border-width: 0 1px;
  height: calc(var(--app-main-content-height) - var(--app-toolbar-height));

  /* fix height of scroll container */
  & :deep(.scroll-container) {
    height: calc(100% - 34px);
  }
}
</style>
