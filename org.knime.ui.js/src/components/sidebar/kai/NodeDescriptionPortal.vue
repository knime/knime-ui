<script setup lang="ts">
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";
import useNodeDescriptionPanel from "./useNodeDescriptionPanel";

const { isKaiActive, closeNodeDescription, selectedNodeTemplate } =
  useNodeDescriptionPanel();
</script>

<template>
  <Portal v-if="isKaiActive" to="extension-panel">
    <Transition name="extension-panel">
      <NodeDescription
        show-close-button
        :selected-node="selectedNodeTemplate"
        @close="closeNodeDescription"
      />
    </Transition>
  </Portal>
</template>

<style lang="postcss" scoped></style>
