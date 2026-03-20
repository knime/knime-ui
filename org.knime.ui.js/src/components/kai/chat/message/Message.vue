<script setup lang="ts">
import { computed, ref, toRef } from "vue";

import KnimeIcon from "@knime/styles/img/KNIME_Triangle.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";

import { type KaiInquiry, KaiMessage } from "@/api/gateway-api/generated-api";
import type { ChainType, Message, StatusUpdate } from "@/store/ai/types";
import MarkdownRenderer from "../MarkdownRenderer.vue";

import FeedbackControls from "./FeedbackControls.vue";
import InquiryResponseTrace from "./InquiryResponseTrace.vue";
import KaiStatus from "./KaiStatus.vue";
import MessagePlaceholder from "./MessagePlaceholder.vue";
import SuggestedNodes from "./SuggestedNodes.vue";
import AdditionalResources from "./additionalResources/AdditionalResources.vue";
import KaiInquiryCard from "./inquiry/KaiInquiryCard.vue";
import { useNodeTemplates } from "./useNodeTemplates";

const emit = defineEmits(["nodeTemplatesLoaded", "showNodeDescription"]);

interface Props extends Message {
  statusUpdate?: StatusUpdate | null;
  pendingInquiry?: { inquiry: KaiInquiry; chainType: ChainType } | null;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  nodes: () => [],
  references: () => ({}),
  workflows: () => [],
  components: () => [],
  inquiryTraces: () => [],
  statusUpdate: null,
  pendingInquiry: null,
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

const hasInquiryTraces = computed(() => props.inquiryTraces.length > 0);

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
      <!-- Inquiry response traces -->
      <div v-if="hasInquiryTraces" class="inquiry-traces">
        <InquiryResponseTrace
          v-for="trace in inquiryTraces"
          :key="trace.inquiry.inquiryId"
          :trace="trace"
        />
      </div>

      <!-- Content area: inquiry card, markdown content, or loading skeleton -->
      <KaiInquiryCard
        v-if="pendingInquiry"
        :inquiry="pendingInquiry.inquiry"
        :chain-type="pendingInquiry.chainType"
      />
      <MarkdownRenderer v-else-if="content" :markdown="displayContent" />
      <MessagePlaceholder v-else />
      <SuggestedNodes :node-templates="nodeTemplates" />
      <AdditionalResources
        :extensions="uninstalledExtensions"
        :components="components"
        :workflows="workflows"
        :references="references"
      />
      <KaiStatus
        :status="statusUpdate?.message"
        :variant="pendingInquiry ? 'waiting' : 'loading'"
      />
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
    top: -21px;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
    height: 21px;

    & .icon {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background-color: var(--knime-white);
      border: 2px solid var(--knime-porcelain);
      border-radius: 100%;

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
    padding: var(--kds-spacing-container-0-75x);
    background-color: var(--knime-white);
    border-radius: 0 5px 5px;

    &.user {
      border-radius: 5px 0 5px 5px;
    }

    &.error {
      background-color: var(--knime-coral-light);
    }

    & .inquiry-traces {
      display: flex;
      flex-direction: column;
      gap: var(--kds-spacing-container-0-25x);
      padding-bottom: var(--kds-spacing-container-0-5x);
      margin-bottom: var(--kds-spacing-container-0-5x);
      border-bottom: 1px solid var(--knime-porcelain);
    }
  }

  & .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
      padding-top: 10px;
      margin-top: -5px;
      margin-left: 2px;
      font-size: 11px;
      font-weight: 500;
      color: var(--knime-dove-gray);
      cursor: pointer;
    }

    & .show-full-content-button:active,
    & .show-full-content-button:hover {
      text-decoration: underline;
    }
  }
}
</style>
