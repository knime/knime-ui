<script setup lang="ts">
import { ref, onBeforeMount } from "vue";

import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import Disclaimer from "./Disclaimer.vue";
import Chat from "./Chat.vue";

const chainType = ref<"qa" | "build">("qa");

const uiStrings = ref({
  disclaimer:
    "The KNIME AI Assistant is a prototype. It is not intended for production.",
  // eslint-disable-next-line camelcase
  welcome_message: {
    qa: "Hi! I am K-AI, your KNIME Q&A Assistant. What would you like to know?",
    build:
      "Hi! I am K-AI, your KNIME Build Assistant. What would you like to build?",
  },
});

onBeforeMount(async () => {
  try {
    const aiAssistantServer = "https://ai-assistant.knime.com/";
    const url = new URL("/v1/ui_strings", aiAssistantServer);
    const response = await fetch(url.toString());
    uiStrings.value = await response.json();
  } catch (error) {
    consola.error("Could not fetch uiStrings.", error);
  }
});
</script>

<template>
  <div class="ai-assistant">
    <div class="header">
      <h2>KNIME AI Assistant</h2>
      <ValueSwitch
        v-model="chainType"
        compact
        :possible-values="[
          { id: 'qa', text: 'Q&A' },
          { id: 'build', text: 'Build' },
        ]"
      />
    </div>
    <hr />
    <Disclaimer :text="uiStrings.disclaimer" />
    <Chat
      v-show="chainType === 'qa'"
      chain-type="qa"
      :system-prompt="uiStrings.welcome_message.qa"
    />
    <Chat
      v-show="chainType === 'build'"
      chain-type="build"
      :system-prompt="uiStrings.welcome_message.build"
    />
  </div>
</template>

<style lang="postcss" scoped>
.ai-assistant {
  font-family: "Roboto Condensed", sans-serif;
  display: flex;
  flex-direction: column;
  padding: 8px 20px 20px;
  height: 100%;

  & .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    & h2 {
      margin: 0;
      font-weight: 400;
      font-size: 18px;
      line-height: 36px;
    }
  }

  & hr {
    margin: 5px 0;
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
  }
}
</style>
