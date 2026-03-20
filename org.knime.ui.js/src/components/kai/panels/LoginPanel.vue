<script setup lang="ts">
import { Button } from "@knime/components";

import { useAiProviderStore } from "@/store/ai/aiProvider";

const aiProviderStore = useAiProviderStore();
</script>

<template>
  <div class="login-panel">
    <div class="slogan">
      Log in to your KNIME Hub account<br />
      to chat with our AI assistant.
    </div>
    <Button primary compact @click="aiProviderStore.connectAiProvider"
      >Login to {{ aiProviderStore.aiProviderId }}</Button
    >
  </div>
</template>

<style lang="postcss" scoped>
.login-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  & .slogan {
    margin: 0 30px 30px;
    font-weight: 700;
  }
}
</style>
