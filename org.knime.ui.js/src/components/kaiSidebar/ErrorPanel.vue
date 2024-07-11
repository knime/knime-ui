<script setup lang="ts">
import { LoadingIcon, Button } from "@knime/components";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";

import { useKaiServer } from "./useKaiServer";

const { fetchUiStrings, isLoading } = useKaiServer();
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>KNIME AI Assistant</h2>
    </template>

    <div class="error-panel">
      <div class="slogan">
        Our AI assistant is currently not available. Please try again later.
      </div>
      <div class="note">
        Please note:<br />
        For Business Hub users, AI features need to be activated by your admin.
      </div>

      <Button primary compact :disabled="isLoading" @click="fetchUiStrings">
        Try again
        <LoadingIcon v-if="isLoading" />
      </Button>
    </div>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
& .error-panel {
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

  & .note {
    margin: 0 35px 20px;
    font-weight: 400;
    font-style: italic;
  }
}
</style>
