<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useStore } from "vuex";

import type { UIExtensionLoadingState } from "@/components/uiExtensions/common/types";

const loaded = ref(false);

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
}>();

onMounted(async () => {
  emit("loadingStateChange", { value: "loading", message: "Loading view" });
  await useStore().dispatch("api/mount");

  loaded.value = true;
  emit("loadingStateChange", { value: "ready" });
});
</script>

<template>
  <span v-if="!loaded"> Loading... </span>
  <PageBuilder v-if="loaded" />
</template>
