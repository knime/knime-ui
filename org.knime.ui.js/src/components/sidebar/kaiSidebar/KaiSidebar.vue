<script setup lang="ts">
import { ref } from "vue";
import useHubAuth from "./useHubAuth";
import useUiStrings from "./useUiStrings";
import ErrorPanel from "./ErrorPanel.vue";
import DisclaimerPanel from "./DisclaimerPanel.vue";
import LoginPanel from "./LoginPanel.vue";
import ChatPanel from "./ChatPanel.vue";

const showDisclaimer = ref(true);
const closeDisclaimer = () => {
  showDisclaimer.value = false;
};
const { isAuthenticated } = useHubAuth();
const { isServerAvailable } = useUiStrings();
</script>

<template>
  <ErrorPanel v-if="!isServerAvailable" />
  <LoginPanel v-else-if="!isAuthenticated" />
  <DisclaimerPanel v-else-if="showDisclaimer" @close="closeDisclaimer" />
  <ChatPanel v-else />
</template>

<style lang="postcss" scoped></style>
