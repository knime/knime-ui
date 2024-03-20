<script setup lang="ts">
import { computed, toRefs } from "vue";
import Button from "webapps-common/ui/components/Button.vue";
import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";

import { useStore } from "@/composables/useStore";

type Props = {
  utmSource?: string;
};

const props = withDefaults(defineProps<Props>(), {
  utmSource: "",
});

defineOptions({
  inheritAttrs: false,
});

const { utmSource } = toRefs(props);

const store = useStore();
const analyticsPlatformDownloadURL = computed(
  () => store.state.application.analyticsPlatformDownloadURL,
);

const parameter = utmSource.value ? `?utm_source=${utmSource.value}` : "";

const href = `${analyticsPlatformDownloadURL.value}${parameter}`;
</script>

<template>
  <Button with-border :href="href" v-bind="$attrs">
    <LinkExternalIcon />
    <span>Go to the download page</span>
  </Button>
</template>
