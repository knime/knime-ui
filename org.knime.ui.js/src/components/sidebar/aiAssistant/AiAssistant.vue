<script setup lang="ts">
import { ref } from "vue";

import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import Disclaimer from "./Disclaimer.vue";
import Chat from "./Chat.vue";

const chainType = ref<"qa" | "build">("qa");
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
    <Disclaimer />
    <Chat
      v-show="chainType === 'qa'"
      chain-type="qa"
      system-prompt="Hi! I am K-AI, your KNIME Q&A Assistant. What would you like to know?"
    />
    <Chat
      v-show="chainType === 'build'"
      chain-type="build"
      system-prompt="Hi! I am K-AI, your KNIME Build Assistant. What would you like to build?"
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
