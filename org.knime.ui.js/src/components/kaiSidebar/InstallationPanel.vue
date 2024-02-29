<script setup lang="ts">
import { API } from "@api";
import { isDesktop } from "@/environment";
import Button from "webapps-common/ui/components/Button.vue";
import BasePanel from "./BasePanel.vue";
import InstallAiIllustration from "@/assets/install-ai-illustration.svg";

const installKai = API.desktop.installKAI;
</script>

<template>
  <BasePanel>
    <div class="installation-panel">
      <InstallAiIllustration />
      <div class="slogan">
        Our <span class="bold">KNIME AI Assistant</span> provides instant
        answers to your questions, suggests nodes or even creates simple
        workflows.
      </div>
      <Button v-if="isDesktop" primary compact @click="installKai"
        >Install AI Assistant</Button
      >
    </div>
  </BasePanel>
</template>

<style lang="postcss" scoped>
& .installation-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  & .slogan {
    margin: 0 10px 30px;
    font-weight: 500;

    & .bold {
      font-weight: 700;
    }
  }
}
</style>
