<script setup lang="ts">
import { Button } from "@knime/components";

import { useKaiServer } from "./useKaiServer";

const { uiStrings } = useKaiServer();

const emit = defineEmits(["close"]);
</script>

<template>
  <div class="disclaimer">
    <div class="title">Disclaimer</div>
    <p class="content">
      {{ uiStrings.disclaimer }}
    </p>
  </div>
  <Button primary compact class="close-button" @click="emit('close')">
    Accept and close
  </Button>
</template>

<style lang="postcss" scoped>
& .disclaimer {
  background-color: var(--knime-white);
  position: relative;
  padding: 20px 15px;
  margin-bottom: 20px;

  & .title {
    font-weight: 700;
  }

  & .content {
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }
}

& .close-button {
  align-self: flex-end;
}
</style>
