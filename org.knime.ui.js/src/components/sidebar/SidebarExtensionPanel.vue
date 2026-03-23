<script lang="ts" setup>
import { storeToRefs } from "pinia";

import { usePanelStore } from "@/store/panel";

const panelStore = usePanelStore();
const { isExtensionPanelOpen } = storeToRefs(panelStore);
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
  position: fixed;
  left: 400px;
  z-index: v-bind("$zIndices.layerDrawerPanel");
  width: 360px;

  /* See KnimeUI.vue where `app-main-content-height` property is being initialized */
  /* stylelint-disable-next-line csstools/value-no-unknown-custom-properties */
  height: calc(var(--app-main-content-height) - var(--app-toolbar-height));
  background-color: var(--knime-gray-ultra-light);
  border: solid var(--knime-silver-sand);
  border-width: 0 1px;

  /* fix height of scroll container */
  & :deep(.scroll-container) {
    height: calc(100% - 34px);
  }
}
</style>
