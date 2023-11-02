<script setup lang="ts">
import { computed, ref, onBeforeMount, watch } from "vue";
import { API } from "@api";

import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";
import { useStore } from "@/composables/useStore";
import { TABS } from "@/store/panel";

import Disclaimer from "./Disclaimer.vue";
import Chat from "./Chat.vue";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";

const DISCLAIMER_DEFAULT_TEXT = `
This chatbot is designed to help you build workflows.

By using this chatbot, you acknowledge and agree the following:
Any information you enter into the chat, as well as information about the workflow (being edited), may be shared with OpenAI and KNIME in order to provide and improve this service.

KNIME is not responsible for any content, input or output, or actions triggered on the workflow, and is not liable for any damages arising from or related to your use of the chatbot.

This is an experimental service, USE AT YOUR OWN RISK.
`;

const store = useStore();
store.dispatch("aiAssistant/getHubID");
const hubId = computed(() => store.state.aiAssistant.hubID);
const selectedNodeTemplate = ref<NodeTemplate | null>(null);

const activeProjectId = computed(() => store.state.application.activeProjectId);
const isExtensionPanelOpen = computed(
  () => store.state.panel.isExtensionPanelOpen,
);
const isAIChatTabActive = computed(
  () => store.state.panel.activeTab[activeProjectId.value] === TABS.AI_CHAT,
);

const showChat = computed(() => {
  const spaceProviders = store.state.spaces.spaceProviders;
  const communityHubProvider = spaceProviders?.[hubId.value];
  return communityHubProvider?.connected;
});

const loginToCommunityHub = () => {
  store.dispatch("spaces/connectProvider", { spaceProviderId: hubId.value });
};

const chainType = ref<"qa" | "build">("qa");

const uiStrings = ref({
  disclaimer: DISCLAIMER_DEFAULT_TEXT.trim(),
  // eslint-disable-next-line camelcase
  welcome_message: {
    qa: "Hi! I am K-AI, your KNIME Q&A Assistant. What would you like to know?",
    build:
      "Hi! I am K-AI, your KNIME Build Assistant. What would you like to build?",
  },
});

onBeforeMount(async () => {
  try {
    uiStrings.value = await API.desktop.getUiStrings();
  } catch (error) {
    consola.error("Could not fetch uiStrings.", error);
  }
});

watch(isExtensionPanelOpen, (isOpen) => {
  if (!isOpen) {
    setTimeout(() => {
      selectedNodeTemplate.value = null;
      // eslint-disable-next-line no-magic-numbers
    }, 50);
  }
});

const toggleNodeDescription = ({ isSelected, nodeTemplate }) => {
  if (!isSelected) {
    store.dispatch("panel/openExtensionPanel");
    selectedNodeTemplate.value = nodeTemplate;
    return;
  }

  store.dispatch("panel/closeExtensionPanel");
};

const closeNodeDescription = () => {
  store.dispatch("panel/closeExtensionPanel");
};
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
    <Disclaimer v-if="uiStrings.disclaimer" :text="uiStrings.disclaimer" />
    <template v-if="showChat">
      <Chat
        v-show="chainType === 'qa'"
        chain-type="qa"
        :system-prompt="uiStrings.welcome_message.qa"
        @show-node-description="toggleNodeDescription"
      />
      <Chat
        v-show="chainType === 'build'"
        chain-type="build"
        :system-prompt="uiStrings.welcome_message.build"
        @show-node-description="toggleNodeDescription"
      />
    </template>
    <div v-else class="login-notice">
      <div>
        Please
        <span role="button" class="login-button" @click="loginToCommunityHub">
          login</span
        >
        to {{ hubId }}.
      </div>
    </div>
    <Portal
      v-if="isExtensionPanelOpen && isAIChatTabActive"
      to="extension-panel"
    >
      <Transition name="extension-panel">
        <NodeDescription
          show-close-button
          :selected-node="selectedNodeTemplate"
          @close="closeNodeDescription"
        />
      </Transition>
    </Portal>
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

  & .login-notice {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;

    & .login-button {
      cursor: pointer;
      text-decoration: underline;
    }
  }
}
</style>
