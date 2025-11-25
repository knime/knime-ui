<script setup lang="ts">
import { computed, toRefs, watch } from "vue";
import { storeToRefs } from "pinia";

import { Button } from "@knime/components";
import GoBackIcon from "@knime/styles/img/icons/arrow-back.svg";
import CancelIcon from "@knime/styles/img/icons/cancel-execution.svg";

import type { XY } from "@/api/gateway-api/generated-api";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";

import { useKaiPanels } from "./panels/useKaiPanels";
import QuickBuildInput from "./quickBuild/QuickBuildInput.vue";
import QuickBuildProcessing from "./quickBuild/QuickBuildProcessing.vue";
import QuickBuildResult from "./quickBuild/QuickBuildResult.vue";
import { useQuickBuild } from "./quickBuild/useQuickBuild";

export type QuickBuildMenuState = "PROCESSING" | "RESULT" | "INPUT" | "NONE";

type Props = {
  nodeId: string | null;
  startPosition: XY;
};

const props = withDefaults(defineProps<Props>(), {
  nodeId: null,
});

const emit = defineEmits<{
  menuBack: [];
  quickBuildStateChanged: [QuickBuildMenuState];
}>();

const { nodeId, startPosition } = toRefs(props);
const { closeQuickActionMenu } = useCanvasAnchoredComponentsStore();

const { panelComponent } = useKaiPanels();

const {
  errorMessage,
  result,
  sendMessage,
  isProcessing,
  lastUserMessage,
  abortSendMessage,
  statusUpdate,
} = useQuickBuild({ nodeId, startPosition });

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
  emit("quickBuildStateChanged", menuState);

  if (menuState === "NONE") {
    closeQuickActionMenu();
  }
});
</script>

<template>
  <div class="quick-build-menu">
    <div v-if="menuState === 'INPUT' || menuState === 'RESULT'" class="header">
      K-AI Build Mode
      <Button
        v-if="menuState === 'INPUT'"
        with-border
        @click="$emit('menuBack')"
      >
        <GoBackIcon />
      </Button>
      <Button
        v-else-if="menuState === 'RESULT'"
        with-border
        @click="closeQuickActionMenu"
      >
        <CancelIcon />
      </Button>
    </div>

    <div class="main">
      <component :is="panelComponent" v-if="panelComponent" class="panel" />
      <template v-else>
        <QuickBuildProcessing
          v-if="menuState === 'PROCESSING'"
          :status="statusUpdate?.message ?? null"
          @abort="abortSendMessage"
        />
        <QuickBuildResult
          v-if="menuState === 'RESULT'"
          :message="result!.message"
          :interaction-id="result!.interactionId"
          @close="closeQuickActionMenu"
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
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .quick-build-menu {
  display: flex;
  flex-direction: column;
  padding: var(--space-8);
  gap: var(--space-8);

  & .header {
    margin-top: calc(var(--space-8) * -1);
    height: 42px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--knime-silver-sand);
    font-weight: 500;
    font-size: 16px;

    & button {
      padding: 0;
      width: 30px;
      height: 30px;
      border-color: var(--knime-silver-sand);

      &:hover {
        background-color: var(--knime-silver-sand);
      }

      & svg {
        @mixin svg-icon-size 18;

        margin-left: 5px;
      }
    }
  }

  & .main {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;

    & .panel:not(.unlicensed-panel) {
      min-height: 200px;
    }
  }
}
</style>
