<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { useElementHover } from "@vueuse/core";

import KnimeIcon from "@knime/styles/img/KNIME_Triangle.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import type { Message, StatusUpdate } from "@/store/aiAssistant";

import FeedbackControls from "./FeedbackControls.vue";
import KaiStatus from "./KaiStatus.vue";
import MarkdownRenderer from "./MarkdownRenderer.vue";
import MessagePlaceholder from "./MessagePlaceholder.vue";
import SuggestedNodes from "./SuggestedNodes.vue";
import AdditionalResources from "./additionalResources/AdditionalResources.vue";
import { useNodeTemplates } from "./useNodeTemplates";

const emit = defineEmits(["nodeTemplatesLoaded", "showNodeDescription"]);

interface Props extends Message {
  statusUpdate?: StatusUpdate | null;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  nodes: () => [],
  references: () => ({}),
  workflows: () => [],
  components: () => [],
  statusUpdate: null,
  isError: false,
});

const messageElement = ref<HTMLElement | null>(null);
const isHovered = useElementHover(messageElement);

const { nodeTemplates, uninstalledExtensions } = useNodeTemplates({
  role: props.role,
  nodes: toRef(props, "nodes"),
  callback: () => emit("nodeTemplatesLoaded"),
});

const isUser = computed(() => props.role === KaiMessage.RoleEnum.User);
const showFeedbackControls = computed(
  () => !isUser.value && !props.isError && props.interactionId,
);
</script>

<template>
  <div ref="messageElement" class="message">
    <div class="header">
      <div class="icon" :class="{ user: isUser }">
        <UserIcon v-if="isUser" />
        <KnimeIcon v-else />
      </div>
    </div>
    <div class="body" :class="{ user: isUser, error: isError }">
      <!-- eslint-disable vue/no-v-html  -->
      <MarkdownRenderer v-if="content" :markdown="content" />
      <MessagePlaceholder v-else />
      <SuggestedNodes :node-templates="nodeTemplates" />
      <AdditionalResources
        :extensions="uninstalledExtensions"
        :components="components"
        :workflows="workflows"
        :references="references"
      />
      <KaiStatus :status="statusUpdate?.message" />
    </div>
    <div class="footer">
      <FeedbackControls
        v-if="showFeedbackControls"
        class="feedback-controls"
        :interaction-id="interactionId!"
        :show-controls="isHovered"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.message {
  position: relative;
  width: 100%;
  font-size: 13px;
  font-weight: 400;

  &:first-child {
    margin-top: 21px;
  }

  & .header {
    position: absolute;
    left: 0;
    top: -21px;
    height: 21px;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: center;

    & .icon {
      position: absolute;
      top: 0;
      left: 0;
      background-color: var(--knime-white);
      border: 2px solid var(--knime-porcelain);
      border-radius: 100%;
      height: 26px;
      width: 26px;
      display: flex;
      justify-content: center;
      align-items: center;

      &.user {
        left: auto;
        right: 0;
      }

      & svg {
        margin-top: -2px;

        @mixin svg-icon-size 16;
      }

      &.user svg.assistant {
        margin-top: -4px;
      }
    }
  }

  & .body {
    border-radius: 0 5px 5px;
    background-color: var(--knime-white);
    padding: 10px 8px;

    &.user {
      border-radius: 5px 0 5px 5px;
    }

    &.error {
      background-color: var(--knime-coral-light);
    }
  }

  & .footer {
    height: 41px;
  }
}
</style>
