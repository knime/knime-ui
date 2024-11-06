<script setup lang="ts">
import { ref } from "vue";

import { Button, Checkbox } from "@knime/components";

import { useDisclaimer } from "./useDisclaimer";

const { disclaimerText, closeDisclaimer } = useDisclaimer();
const shouldNotAskAgain = ref(false);
const close = () => closeDisclaimer(shouldNotAskAgain.value);
</script>

<template>
  <div class="disclaimer">
    <div class="main">
      <div class="title">Disclaimer</div>
      <p class="content">
        {{ disclaimerText }}
      </p>
    </div>
    <div class="controls">
      <Checkbox v-model="shouldNotAskAgain" class="checkbox">
        Do not show again
      </Checkbox>
      <Button primary compact @click="close"> Accept and continue </Button>
    </div>
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

    & .title {
      font-weight: 700;
    }

    & .content {
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
  }

  & .controls {
    align-self: flex-end;
    display: flex;
    flex-direction: column;
  }

  & .checkbox {
    font-size: 12px;
    margin-top: var(--space-8);
  }
}
</style>
