<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";

import { KdsButton } from "@knime/kds-components";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import type { QuickActionMenuContext } from "../workflowEditor/CanvasAnchoredComponents/QuickActionMenu/types";

import Message from "./chat/message/Message.vue";
import { useKaiPanels } from "./panels/useKaiPanels";
import QuickBuildInput from "./quickBuild/QuickBuildInput.vue";
import QuickBuildResult from "./quickBuild/QuickBuildResult.vue";
import { useQuickBuild } from "./quickBuild/useQuickBuild";

export type QuickBuildMenuState = "PROCESSING" | "RESULT" | "INPUT" | "NONE";

const QUICK_BUILD_PROCESSING_OFFSET = 70;
const QUICK_BUILD_RESULT_OFFSET = -40;

type Props = {
  quickActionContext: QuickActionMenuContext;
};

const props = defineProps<Props>();

const nodeId = computed(() => props.quickActionContext.nodeId);
const canvasPosition = computed(() => props.quickActionContext.canvasPosition);
const nodeRelation = computed(() => props.quickActionContext.nodeRelation);

const { panelComponent } = useKaiPanels();

const {
  errorMessage,
  result,
  sendMessage,
  isProcessing,
  lastUserMessage,
  abortSendMessage,
  statusUpdate,
  pendingInquiry,
  pendingInquiryTraces,
  lastMessageInquiryTraces,
} = useQuickBuild({ nodeId, startPosition: canvasPosition });

const { usage } = storeToRefs(useAIAssistantStore());

const menuState = computed<QuickBuildMenuState>(() => {
  if (isProcessing.value) {
    return "PROCESSING";
  }

  if (result.value) {
    if (Object.keys(result.value).length === 0) {
      // User cancelled the ai request.
      return "NONE";
    }

    // Ideally, we would check for "SUCCESS" here. To be backwards compatible,
    // we check for "INPUT_NEEDED" instead.
    if (result.value.type !== "INPUT_NEEDED") {
      return "RESULT";
    }
  }

  return "INPUT";
});

watch(menuState, (menuState) => {
  switch (menuState) {
    case "PROCESSING": {
      props.quickActionContext.updateMenuStyle({
        topOffset: QUICK_BUILD_PROCESSING_OFFSET,
      });
      return;
    }

    case "RESULT": {
      props.quickActionContext.updateMenuStyle({
        topOffset: QUICK_BUILD_RESULT_OFFSET,
      });
      return;
    }

    case "INPUT": {
      props.quickActionContext.updateMenuStyle({
        anchor: nodeRelation.value ? "top-left" : "top-right",
      });
      return;
    }

    case "NONE": {
      props.quickActionContext.updateMenuStyle({});
      props.quickActionContext.closeMenu();
    }
  }
});
</script>

<template>
  <div class="quick-build-menu">
    <Component :is="panelComponent" v-if="panelComponent" class="panel" />
    <template v-else>
      <template v-if="menuState === 'PROCESSING'">
        <Message
          key="processing"
          class="processing-message"
          :role="KaiMessage.RoleEnum.Assistant"
          :content="''"
          :status-update="statusUpdate"
          :pending-inquiry="
            pendingInquiry && { inquiry: pendingInquiry, chainType: 'build' }
          "
          :inquiry-traces="pendingInquiryTraces"
        />
        <KdsButton
          class="cancel-button"
          label="Cancel"
          leading-icon="x-close"
          variant="outlined"
          size="xsmall"
          @click="abortSendMessage"
        />
      </template>
      <QuickBuildResult
        v-if="menuState === 'RESULT'"
        :message="result!.message"
        :interaction-id="result!.interactionId"
        :inquiry-traces="lastMessageInquiryTraces"
        @close="quickActionContext.closeMenu"
      />
      <QuickBuildInput
        v-if="menuState === 'INPUT'"
        :prompt="result?.message"
        :interaction-id="result?.interactionId"
        :last-user-message="lastUserMessage"
        :error-message="errorMessage"
        :usage="usage"
        @send-message="sendMessage"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .quick-build-menu {
  display: flex;
  padding: var(--space-8);
  margin-top: var(--space-8);
  flex-direction: column;
  justify-content: flex-end;

  & .panel:not(.unlicensed-panel) {
    min-height: 200px;
  }

  & .processing-message {
    margin-top: 20px;
  }

  & .cancel-button {
    align-self: flex-end;
  }
}
</style>
