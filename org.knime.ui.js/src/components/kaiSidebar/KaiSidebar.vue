<script setup lang="ts">
import { ref } from "vue";
import { useFeatures } from "@/plugins/feature-flags";
import { useHubAuth } from "./useHubAuth";
import { useKaiServer } from "./useKaiServer";
import InstallationPanel from "./InstallationPanel.vue";
import ErrorPanel from "./ErrorPanel.vue";
import DisclaimerPanel from "./DisclaimerPanel.vue";
import LoginPanel from "./LoginPanel.vue";
import ChatPanel from "./ChatPanel.vue";

const { isKaiInstalled: _isKaiInstalled } = useFeatures();
const isKaiInstalled = _isKaiInstalled();
const { isAuthenticated } = useHubAuth();
const { isServerAvailable } = useKaiServer();
const showDisclaimer = ref(true);
const closeDisclaimer = () => {
  showDisclaimer.value = false;
};
</script>

<template>
  <InstallationPanel v-if="!isKaiInstalled" />
  <ErrorPanel v-else-if="!isServerAvailable" />
  <LoginPanel v-else-if="!isAuthenticated" />
  <DisclaimerPanel v-else-if="showDisclaimer" @close="closeDisclaimer" />
  <ChatPanel v-else />
</template>

<style lang="postcss" scoped></style>
