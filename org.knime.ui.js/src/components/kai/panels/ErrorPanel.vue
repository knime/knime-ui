<script setup lang="ts">
import { storeToRefs } from "pinia";

import { Button, LoadingIcon } from "@knime/components";

import { useAiProviderStore } from "@/store/ai/aiProvider";

const aiProviderStore = useAiProviderStore();
const { providerStatus } = storeToRefs(aiProviderStore);
</script>

<template>
  <div class="error-panel">
    <div class="slogan">
      The AI assistant is currently unavailable. Try again later.
    </div>
    <div class="note">
      Please note:<br />
      For Business Hub users, AI features need to be activated by your admin.
    </div>

    <Button
      primary
      compact
      :disabled="providerStatus === 'checkingBackend'"
      @click="aiProviderStore.fetchUiStrings({ force: true })"
    >
      Try again
      <LoadingIcon v-if="providerStatus === 'checkingBackend'" />
    </Button>
  </div>
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
