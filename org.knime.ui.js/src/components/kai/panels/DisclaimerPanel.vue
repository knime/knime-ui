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
    background-color: var(--knime-white);
    position: relative;
    padding: var(--space-24) var(--space-16);

    & .title {
      font-weight: 700;
      padding-bottom: var(--space-8);
    }
  }

  & .controls {
    align-self: flex-end;
    display: flex;
    flex-direction: column;
  }

  & .checkbox {
    margin: var(--space-8) 0;
  }
}
</style>
