<script setup lang="ts">
import CogIcon from "@knime/styles/img/icons/cog.svg";

import { API } from "@/api";
import DummyNodesEmptyState from "@/components/common/DummyNodesEmptyState.vue";

const openWorkflowCoachPreferencePage = () => {
  API.desktop.openWorkflowCoachPreferencePage();
};
</script>

<template>
  <div class="disabled-workflow-coach">
    <DummyNodesEmptyState
      :icon="CogIcon"
      button-text="Open preferences"
      @click="openWorkflowCoachPreferencePage"
    >
      <template #default>
        The <strong>workflow coach</strong> will help you build workflows by
        suggesting nodes. To activate this function change the settings in the
        preference page.
      </template>
    </DummyNodesEmptyState>
  </div>
</template>

<style lang="postcss">
.disabled-workflow-coach {
  padding: var(--space-16);
  margin: 0 var(--space-12);
}
</style>
