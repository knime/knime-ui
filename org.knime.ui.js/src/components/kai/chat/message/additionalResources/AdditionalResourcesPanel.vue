<script setup lang="ts">
import ComponentIcon from "@knime/styles/img/icons/component.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import CloseButton from "@/components/common/CloseButton.vue";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import { useKaiExtensionPanel } from "@/components/kai/useKaiExtensionPanel";

import SuggestedExtensions from "./SuggestedExtensions.vue";
import SuggestedHubItems from "./SuggestedHubItems.vue";

const { additionalResources, closeKaiExtensionPanel } = useKaiExtensionPanel();

const { workflows, extensions, components } = additionalResources.value!;
</script>

<template>
  <SidebarPanelLayout class="additional-resources">
    <template #header>
      <h2>Additional Resources</h2>
      <CloseButton class="close-button" @close="closeKaiExtensionPanel" />
    </template>
    <SidebarPanelScrollContainer class="node-info">
      <SuggestedExtensions :extensions="extensions" />
      <SuggestedHubItems :items="workflows">
        <template #title> <ComponentIcon /> Components </template>
      </SuggestedHubItems>
      <SuggestedHubItems :items="components">
        <template #title> <WorkflowIcon /> Workflows </template>
      </SuggestedHubItems>
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped></style>
