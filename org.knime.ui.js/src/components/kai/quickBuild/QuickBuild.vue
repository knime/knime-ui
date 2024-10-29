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
  userQuery,
  error,
  result,
  sendMessage,
  isProcessing,
  lastUserMessage,
  abortSendMessage,
  statusUpdate,
} = useQuickBuild({ nodeId });
</script>

<template>
  <QuickBuildResult v-if="result" @close="closeQuickActionMenu" :message="result" />
  <QuickBuildProcessing
    v-else-if="isProcessing"
    :status="statusUpdate"
    @abort="abortSendMessage"
  />
  <QuickBuildInput
    v-else
    :is-processing="isProcessing"
    :last-user-message="lastUserMessage"
    :error="error"
    @send-message="sendMessage"
    @abort="abortSendMessage"
  />
</template>
