<script setup lang="ts">
import { ref } from "vue";

import { KdsButton, KdsCheckbox } from "@knime/kds-components";

import MarkdownRenderer from "../chat/MarkdownRenderer.vue";

import { useDisclaimer } from "./useDisclaimer";

const { disclaimerText, closeDisclaimer } = useDisclaimer();
const shouldNotAskAgain = ref(false);
const close = () => closeDisclaimer(shouldNotAskAgain.value);
</script>

<template>
  <div class="disclaimer">
    <div class="main">
      <div class="title">Disclaimer</div>
      <MarkdownRenderer :markdown="disclaimerText" allow-hyperlinks />
    </div>
    <div class="controls">
      <KdsCheckbox
        v-model="shouldNotAskAgain"
        class="checkbox"
        label="Do not show again"
      />
      <KdsButton label="Accept and continue" @click="close" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.disclaimer {
  display: flex;
  flex-direction: column;

  & .main {
    position: relative;
    padding: var(--space-24) var(--space-16);
    background-color: var(--knime-white);

    & .title {
      padding-bottom: var(--space-8);
      font-weight: 700;
    }
  }

  & .controls {
    display: flex;
    flex-direction: column;
    align-self: flex-end;
  }

  & .checkbox {
    margin: var(--space-8) 0;
  }
}
</style>
