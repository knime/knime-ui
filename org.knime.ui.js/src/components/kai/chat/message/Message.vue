<script setup lang="ts">
import { computed, ref, toRef } from "vue";

import KnimeIcon from "@knime/styles/img/KNIME_Triangle.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import type { Message, StatusUpdate } from "@/store/ai/types";
import MarkdownRenderer from "../MarkdownRenderer.vue";

import FeedbackControls from "./FeedbackControls.vue";
import KaiStatus from "./KaiStatus.vue";
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
  kind: "other",
});

const { nodeTemplates, uninstalledExtensions } = useNodeTemplates({
  role: props.role,
  nodes: toRef(props, "nodes"),
  callback: () => emit("nodeTemplatesLoaded"),
});

const isUser = computed(() => props.role === KaiMessage.RoleEnum.User);
const shouldShowFeedbackButtons = computed(
  () => !isUser.value && !props.isError && props.interactionId,
);

// Message content is only truncated for K-AI's explanations in Quick Build Mode
const shouldTruncateContent = computed(() => {
  const lines = props.content.split(/\r?\n/);
  return props.kind === "quick-build-explanation" && lines.length > 2;
});
const isContentExpanded = ref(!shouldTruncateContent.value);

const displayContent = computed(() => {
  if (!shouldTruncateContent.value || isContentExpanded.value) {
    return props.content;
  }

  const lines = props.content.split(/\r?\n/);
  if (lines.length > 2) {
    return `${lines.slice(0, 2).join("\n")} …`;
  }
  return props.content;
});
</script>

<template>
  <div class="message">
    <!-- Message's sender icon -->
    <div class="header">
      <div class="icon" :class="{ user: isUser }">
        <UserIcon v-if="isUser" />
        <KnimeIcon v-else />
      </div>
    </div>

    <!-- Message content -->
    <div class="body" :class="{ user: isUser, error: isError }">
      <MarkdownRenderer v-if="content" :markdown="displayContent" />
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

    <!-- Feedback buttons -->
    <div class="footer">
      <div class="footer-left">
        <template v-if="shouldTruncateContent && !isContentExpanded">
          <button
            class="show-full-content-button"
            @click="isContentExpanded = true"
          >
            Show full explanation
          </button>
        </template>
      </div>

      <div class="footer-right">
        <FeedbackControls
          v-if="shouldShowFeedbackButtons"
          class="feedback-controls"
          :interaction-id="interactionId!"
        />
      </div>
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 25px;

    & .footer-left {
      flex: 1;
      text-align: left;
    }

    & .footer-right {
      text-align: right;
    }

    & .show-full-content-button {
      all: unset;
      cursor: pointer;
      font-weight: 500;
      font-size: 11px;
      padding-top: 10px;
      color: var(--knime-dove-grey);
      margin-top: -5px;
      margin-left: 2px;
    }

    & .show-full-content-button:active,
    & .show-full-content-button:hover {
      text-decoration: underline;
    }
  }
}
</style>
