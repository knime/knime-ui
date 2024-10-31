<script setup lang="ts">
import { type Ref, ref, toRefs } from "vue";
import { useStore } from "vuex";

import QuickBuildInput from "./QuickBuildInput.vue";
import QuickBuildProcessing from "./QuickBuildProcessing.vue";
import QuickBuildResult from "./QuickBuildResult.vue";
import { useQuickBuild } from "./useQuickBuild";

type Props = {
  nodeId?: Ref<string | null>;
};

const props = withDefaults(defineProps<Props>(), {
  nodeId: ref(null),
});

const { nodeId } = toRefs(props);

const store = useStore();

const closeQuickActionMenu = () => {
  store.dispatch("workflow/closeQuickActionMenu");
};

const {
  errorMessage,
  result,
  sendMessage,
  isProcessing,
  lastUserMessage,
  abortSendMessage,
  statusUpdate,
} = useQuickBuild({ nodeId });
</script>

<template>
  <QuickBuildProcessing
    v-if="isProcessing"
    :status="statusUpdate"
    @abort="abortSendMessage"
  />
  <template v-else-if="result">
    <QuickBuildResult
      v-if="result.type === 'SUCCESS'"
      :message="result.message"
      @close="closeQuickActionMenu"
    />
    <QuickBuildInput
      v-else-if="result.type === 'INPUT_NEEDED'"
      :prompt="result.message"
      :last-user-message="lastUserMessage"
      :error-message="errorMessage"
      @send-message="sendMessage"
      @abort="abortSendMessage"
    />
  </template>
  <QuickBuildInput
    v-else
    :last-user-message="lastUserMessage"
    :error-message="errorMessage"
    @send-message="sendMessage"
    @abort="abortSendMessage"
  />
</template>
