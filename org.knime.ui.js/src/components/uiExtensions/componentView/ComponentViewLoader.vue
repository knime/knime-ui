<script setup lang="ts">
import { getCurrentInstance, ref } from "vue";
import { storeKey, useStore } from "vuex";

import type { UIExtensionLoadingState } from "@/components/uiExtensions/common/types";
import { setupPageBuilderEnvironment } from "@/pageBuilderLoader.ts";

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

const loaded = ref(false);
emit("loadingStateChange", { value: "loading", message: "Loading view" });
const instance = getCurrentInstance();
if (instance) {
  if (!instance.appContext.provides[storeKey]) {
    const app = instance.appContext.app;
    await setupPageBuilderEnvironment(app, props.projectId);
  }

  const store = useStore();
  await store.dispatch("api/mount");
  loaded.value = true;
  emit("loadingStateChange", { value: "ready" });
} else {
  emit("loadingStateChange", {
    value: "error",
    message: "Failed to get current Vue instance",
  });
}
</script>

<template>
  <PageBuilder v-if="loaded" />
</template>
