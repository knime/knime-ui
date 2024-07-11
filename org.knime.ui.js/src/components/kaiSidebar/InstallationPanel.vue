<script setup lang="ts">
import { API } from "@api";
import { compatibility } from "@/environment";
import { Button } from "@knime/components";

import InstallAiIllustration from "@/assets/install-ai-illustration.svg";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";

const installKai = API.desktop.installKAI;
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>KNIME AI Assistant</h2>
    </template>

    <div class="installation-panel">
      <InstallAiIllustration />
      <div class="slogan">
        Our <span class="bold">KNIME AI Assistant</span> provides instant
        answers to your questions, suggests nodes or even creates simple
        workflows.
      </div>

      <Button
        v-if="compatibility.isAiAssistantSupported()"
        primary
        compact
        @click="installKai"
        >Install AI Assistant</Button
      >
      <template v-else>
        <div class="slogan">
          The KNIME AI Assistant is not available in the playground. To try its
          capabilites, get the free and open source KNIME Analytics Platform.
        </div>
        <DownloadAPButton
          v-if="$store.state.application.permissions.showFloatingDownloadButton"
          compact
          src="k-ai-panel"
        />
      </template>
    </div>
  </SidebarPanelLayout>
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
