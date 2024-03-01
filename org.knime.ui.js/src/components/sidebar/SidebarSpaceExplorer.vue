<script lang="ts" setup>
import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";
import { useStore } from "@/composables/useStore";
import { computed, ref } from "vue";

const store = useStore();
const activeProjectId = computed(() => store.state.application.activeProjectId);

const selectedItemIds = ref<string[]>([]);
</script>

<template>
  <SpaceExplorer
    v-if="activeProjectId"
    v-model:selected-item-ids="selectedItemIds"
    mode="mini"
    :project-id="activeProjectId"
  />
</template>
