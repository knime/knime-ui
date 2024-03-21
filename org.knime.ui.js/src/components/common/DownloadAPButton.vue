<script setup lang="ts">
import { computed } from "vue";
import Button from "webapps-common/ui/components/Button.vue";
import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";

import { useStore } from "@/composables/useStore";

type Props = {
  utmSource?: string;
};

const props = withDefaults(defineProps<Props>(), {
  utmSource: "",
});

const store = useStore();
const analyticsPlatformDownloadURL = computed(
  () => store.state.application.analyticsPlatformDownloadURL,
);

const href = computed(() => {
  const parameter = props.utmSource ? `?utm_source=${props.utmSource}` : "";

  return `${analyticsPlatformDownloadURL.value}${parameter}`;
});
</script>

<template>
  <Button with-border compact :href="href">
    <LinkExternalIcon />
    <span>Go to the download page</span>
  </Button>
</template>
