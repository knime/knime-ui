<script setup lang="ts">
import { computed, toRefs } from "vue";

import { Button } from "@knime/components";
import GoBackIcon from "@knime/styles/img/icons/arrow-back.svg";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

import { useKaiPanels } from "./panels/useKaiPanels";
import QuickBuildInput from "./quickBuild/QuickBuildInput.vue";
import QuickBuildProcessing from "./quickBuild/QuickBuildProcessing.vue";
import QuickBuildResult from "./quickBuild/QuickBuildResult.vue";
import { useQuickBuild } from "./quickBuild/useQuickBuild";

type Props = {
  nodeId: string | null;
  startPosition: XY;
};

const props = withDefaults(defineProps<Props>(), {
  nodeId: null,
});

defineEmits(["menuBack"]);

const { nodeId, startPosition } = toRefs(props);

const store = useStore();

const closeQuickActionMenu = () => {
  store.dispatch("workflow/closeQuickActionMenu");
};

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

const menuState = computed<"PROCESSING" | "RESULT" | "INPUT">(() => {
  if (isProcessing.value) {
    return "PROCESSING";
  }
  // Ideally, we would check for "SUCCESS" here. To be backwards compatible,
  // we check for "INPUT_NEEDED" instead.
  if (result?.value && result.value.type !== "INPUT_NEEDED") {
    return "RESULT";
  }
  return "INPUT";
});
</script>

<template>
  <div class="quick-build-menu">
    <div v-if="menuState === 'INPUT'" class="header">
      K-AI Build Mode
      <Button with-border @click="$emit('menuBack')"><GoBackIcon /></Button>
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
          :last-user-message="lastUserMessage"
          :error-message="errorMessage"
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
    & .panel {
      min-height: 200px;
    }
  }
}
</style>
