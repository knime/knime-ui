<script setup lang="ts">
import { computed, toRefs, watch } from "vue";

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

const isKaiEnabled = computed(() => store.state.application.isKaiEnabled);
watch(isKaiEnabled, (newValue) => {
  if (newValue === false) {
    // We close the Quick Action Menu if K-AI gets disabled while we're in Quick Build Mode
    closeQuickActionMenu();
  }
});

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
</script>

<template>
  <div class="quick-build-menu">
    <div v-if="!isProcessing && result?.type !== 'SUCCESS'" class="header">
      K-AI Build Mode
      <Button with-border @click="$emit('menuBack')"><GoBackIcon /></Button>
    </div>
    <div class="main">
      <component :is="panelComponent" v-if="panelComponent" class="panel" />
      <template v-else>
        <QuickBuildProcessing
          v-if="isProcessing"
          :status="statusUpdate?.message ?? null"
          @abort="abortSendMessage"
        />
        <QuickBuildResult
          v-else-if="result?.type === 'SUCCESS'"
          :message="result.message"
          :interaction-id="result.interactionId"
          @close="closeQuickActionMenu"
        />
        <QuickBuildInput
          v-else
          :prompt="result?.message"
          :last-user-message="lastUserMessage"
          :error-message="errorMessage"
          @send-message="sendMessage"
          @abort="abortSendMessage"
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
