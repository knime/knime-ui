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
</script>

<template>
  <SidebarPanelLayout class="additional-resources">
    <template #header>
      <h2>Additional Resources</h2>
      <CloseButton class="close-button" @close="closeKaiExtensionPanel" />
    </template>
    <SidebarPanelScrollContainer>
      <div class="body">
        <SuggestedHubItems :items="additionalResources.components">
          <template #title> <WorkflowIcon /> Workflows </template>
        </SuggestedHubItems>
        <SuggestedHubItems :items="additionalResources.workflows">
          <template #title> <ComponentIcon /> Components </template>
        </SuggestedHubItems>
        <SuggestedExtensions :extensions="additionalResources.extensions" />
      </div>
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.additional-resources {
  & .body {
    padding-top: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-24)
  }
}
</style>
