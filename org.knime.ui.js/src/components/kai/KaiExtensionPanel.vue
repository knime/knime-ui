<script setup lang="ts">
import { watch } from "vue";

import NativeNodeDescription from "../nodeDescription/NativeNodeDescription.vue";

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
    <Transition
      v-if="panelMode === 'node_description' && selectedNodeTemplate"
      name="extension-panel"
    >
      <NativeNodeDescription
        :name="selectedNodeTemplate.name"
        :node-template-id="selectedNodeTemplate.id"
        :node-factory="selectedNodeTemplate.nodeFactory!"
        show-close-button
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
