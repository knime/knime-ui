<script setup lang="ts">
import { watch } from "vue";
import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import { useNodeDescriptionPanel } from "./useNodeDescriptionPanel";

const {
  isKaiActive,
  isExtensionPanelOpen,
  clearSelectedNodeTemplate,
  closeNodeDescription,
  selectedNodeTemplate,
} = useNodeDescriptionPanel();

watch(isExtensionPanelOpen, (isOpen) => {
  if (!isOpen) {
    clearSelectedNodeTemplate();
  }
});
</script>

<template>
  <Portal v-if="isKaiActive" to="extension-panel">
    <Transition name="extension-panel">
      <NodeDescription
        show-close-button
        :params="selectedNodeTemplate"
        @close="closeNodeDescription"
      />
    </Transition>
  </Portal>
</template>

<style lang="postcss" scoped></style>
