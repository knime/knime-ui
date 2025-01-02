<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { Button } from "@knime/components";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { useApplicationStore } from "@/store/application/application";

type Props = {
  src: string;
  compact?: boolean;
  onDark?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  onDark: false,
});

const { analyticsPlatformDownloadURL } = storeToRefs(useApplicationStore());

const href = computed(() => {
  const parameter = `?src=${props.src}`;

  return `${analyticsPlatformDownloadURL.value}${parameter}`;
});
</script>

<template>
  <Button
    primary
    :on-dark="onDark"
    :compact="compact"
    :href="href"
    target="_blank"
  >
    <LinkExternalIcon />
    <span><b>Get KNIME Analytics Platform</b></span>
  </Button>
</template>
