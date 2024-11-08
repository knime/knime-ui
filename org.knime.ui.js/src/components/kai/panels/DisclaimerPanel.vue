<script setup lang="ts">
import { Button } from "@knime/components";

import { useKaiServer } from "../useKaiServer";

const { uiStrings } = useKaiServer();

const emit = defineEmits(["close"]);
</script>

<template>
  <div class="disclaimer">
    <div class="main">
      <div class="title">Disclaimer</div>
      <p class="content">
        {{ uiStrings.disclaimer }}
      </p>
    </div>
    <Button primary compact class="close-button" @click="emit('close')">
      Accept and continue
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.disclaimer {
  display: flex;
  flex-direction: column;

  & .main {
    background-color: var(--knime-white);
    position: relative;
    padding: var(--space-24) var(--space-16);
    margin-bottom: var(--space-24);

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
}
</style>
