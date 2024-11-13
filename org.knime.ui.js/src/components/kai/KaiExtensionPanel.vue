<script setup lang="ts">
import { watch } from "vue";

import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";

import AdditionalResourcesPanel from "./chat/message/additionalResources/AdditionalResourcesPanel.vue";
import { useKaiExtensionPanel } from "./useKaiExtensionPanel";

const {
  isExtensionPanelOpen,
  closeKaiExtensionPanel,
  panelMode,
  selectedNodeTemplate,
} = useKaiExtensionPanel();

watch(isExtensionPanelOpen, (isOpen) => {
  if (!isOpen) {
    closeKaiExtensionPanel();
  }
});
</script>

<template>
  <Portal v-if="panelMode" to="extension-panel">
    <Transition v-if="panelMode === 'node_description'" name="extension-panel">
      <NodeDescription
        show-close-button
        :params="selectedNodeTemplate"
        @close="closeKaiExtensionPanel"
      />
    </Transition>
    <Transition
      v-if="panelMode === 'additional_resources'"
      name="extension-panel"
    >
      <AdditionalResourcesPanel />
    </Transition>
  </Portal>
</template>
