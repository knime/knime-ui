<script setup lang="ts">
import { Button } from "@knime/components";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { useAnalyticsPlatformDownloadUrl } from "@/composables/useAnalyticsPlatformDownloadUrl";

type Props = {
  src: string;
  compact?: boolean;
  onDark?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  onDark: false,
});

const { href } = useAnalyticsPlatformDownloadUrl(props.src);
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
