<script setup lang="ts">
import { computed } from "vue";
import Button from "webapps-common/ui/components/Button.vue";
import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";

import { useStore } from "@/composables/useStore";

type Props = {
  src: string;
  compact?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  compact: false,
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
  <Button primary :compact="compact" :href="href">
    <LinkExternalIcon />
    <span><b>Get KNIME Analytics Platform</b></span>
  </Button>
</template>
