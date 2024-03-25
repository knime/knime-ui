<script setup lang="ts">
import { computed } from "vue";
import Button from "webapps-common/ui/components/Button.vue";
import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";

import { useStore } from "@/composables/useStore";

type Props = {
  utmSource?: string;
  main?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  utmSource: "",
  main: false,
});

const store = useStore();
const analyticsPlatformDownloadURL = computed(
  () => store.state.application.analyticsPlatformDownloadURL,
);

const href = computed(() => {
  const parameter = props.utmSource ? `?src=${props.utmSource}` : "";

  return `${analyticsPlatformDownloadURL.value}${parameter}`;
});
</script>

<template>
  <Button primary :compact="main ? false : true" :href="href">
    <LinkExternalIcon />
    <span>Go to the download page</span>
  </Button>
</template>
