<script setup lang="ts">
import { API } from "@api";

import { Button } from "@knime/components";


const openPreferencePage = API.desktop.openAiAssistantPreferencePage;
</script>

<template>
  <div class="login-panel">
    <div class="slogan">Select a Hub for K-AI to connect to.</div>
    <Button primary compact @click="openPreferencePage">
      Open preferences
    </Button>
  </div>
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
