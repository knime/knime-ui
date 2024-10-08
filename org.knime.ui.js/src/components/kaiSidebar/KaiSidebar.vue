<script setup lang="ts">
import { computed, ref } from "vue";

import { useFeatures } from "@/plugins/feature-flags";

import ChatPanel from "./ChatPanel.vue";
import DisclaimerPanel from "./DisclaimerPanel.vue";
import ErrorPanel from "./ErrorPanel.vue";
import InstallationPanel from "./InstallationPanel.vue";
import LoginPanel from "./LoginPanel.vue";
import NoHubConfiguredPanel from "./NoHubConfiguredPanel.vue";
import { useHubAuth } from "./useHubAuth";
import { useKaiServer } from "./useKaiServer";

const { isKaiInstalled: _isKaiInstalled } = useFeatures();
const isKaiInstalled = _isKaiInstalled();
const { isHubConfigured, isAuthenticated } = useHubAuth();
const { isServerAvailable, hasDisclaimer } = useKaiServer();

const isDisclaimerOpen = ref(true);
const closeDisclaimer = () => {
  isDisclaimerOpen.value = false;
};
const showDisclaimer = computed(
  () => hasDisclaimer.value && isDisclaimerOpen.value,
);
</script>

<template>
  <InstallationPanel v-if="!isKaiInstalled" />
  <NoHubConfiguredPanel v-else-if="!isHubConfigured" />
  <ErrorPanel v-else-if="!isServerAvailable" />
  <LoginPanel v-else-if="!isAuthenticated" />
  <DisclaimerPanel v-else-if="showDisclaimer" @close="closeDisclaimer" />
  <ChatPanel v-else />
</template>

<style lang="postcss" scoped></style>
