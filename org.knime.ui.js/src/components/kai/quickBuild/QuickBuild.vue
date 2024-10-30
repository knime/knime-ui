<script setup lang="ts">
import { ref, toRefs, type Ref } from "vue";
import { useQuickBuild } from "./useQuickBuild";

import QuickBuildInput from "./QuickBuildInput.vue";
import QuickBuildProcessing from "./QuickBuildProcessing.vue";
import QuickBuildResult from "./QuickBuildResult.vue";
import { useStore } from "vuex";

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
  <template v-if="result">
    <QuickBuildResult
      v-if="result.type === 'SUCCESS'"
      @close="closeQuickActionMenu"
      :message="result.message"
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
  <QuickBuildProcessing
    v-else-if="isProcessing"
    :status="statusUpdate"
    @abort="abortSendMessage"
  />
  <QuickBuildInput
    v-else
    :last-user-message="lastUserMessage"
    :error-message="errorMessage"
    @send-message="sendMessage"
    @abort="abortSendMessage"
  />
</template>
