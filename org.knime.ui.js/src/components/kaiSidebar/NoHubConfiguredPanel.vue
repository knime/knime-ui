<script setup lang="ts">
import { Button } from "@knime/components";

import { API } from "@/api";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";

const openPreferencePage = API.desktop.openAiAssistantPreferencePage;
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>KNIME AI Assistant</h2>
    </template>

    <div class="login-panel">
      <div class="slogan">
        Please select a Hub to which K-AI should connect.
      </div>
      <Button primary compact @click="openPreferencePage">
        Open references
      </Button>
    </div>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
& .login-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  & .slogan {
    margin: 0 30px 30px;
    font-weight: 700;
  }
}
</style>
