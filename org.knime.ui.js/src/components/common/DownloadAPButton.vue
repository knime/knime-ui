<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@knime/components";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { useStore } from "@/composables/useStore";

type Props = {
  src: string;
  compact?: boolean;
  onDark?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  onDark: false,
});

const store = useStore();
const analyticsPlatformDownloadURL = computed(
  () => store.state.application.analyticsPlatformDownloadURL,
);

const href = computed(() => {
  const parameter = `?src=${props.src}`;

  return `${analyticsPlatformDownloadURL.value}${parameter}`;
});
</script>

<template>
  <Button primary :on-dark="onDark" :compact="compact" :href="href">
    <LinkExternalIcon />
    <span><b>Get KNIME Analytics Platform</b></span>
  </Button>
</template>
